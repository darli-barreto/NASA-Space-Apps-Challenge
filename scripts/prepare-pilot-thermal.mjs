import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const pilot = JSON.parse(await readFile(new URL("../data/pilot-evidence.json", import.meta.url), "utf8"));
const center = pilot.coordinates.earthLonLat[40];
const moon = pilot.coordinates.moonLonLat[40];
const modisUrl = "https://modis.ornl.gov/rst/api/v1/MOD11A2/subset?" + new URLSearchParams({
  latitude: center[1], longitude: center[0], startDate: "A2026001", endDate: "A2026025",
  kmAboveBelow: 2, kmLeftRight: 2,
});
const base = "https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_pcp/diurnal/ltim/pols/";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
async function get(url, headers = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}: ${url}`);
      }
      return response;
    } catch (error) {
      if (attempt === 2) throw new Error(`Failed to retrieve ${url}`, { cause: error });
      await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
}

async function modis() {
  const response = await get(modisUrl);
  const raw = await response.json();
  if (Math.abs(raw.latitude - center[1]) > 1e-6 || Math.abs(raw.longitude - center[0]) > 1e-6 ||
      raw.nrows !== 5 || raw.ncols !== 5 || !Array.isArray(raw.subset)) throw new Error("Unexpected MODIS subset");
  const bands = ["LST_Day_1km", "LST_Night_1km", "QC_Day", "QC_Night", "Day_view_time", "Night_view_time"];
  const rows = raw.subset.filter(row => bands.includes(row.band));
  const dates = [...new Set(rows.map(r => r.calendar_date))].sort();
  if (dates.length !== 4) throw new Error("Expected four MODIS composites");
  for (const date of dates) for (const band of bands) {
    const matched = rows.filter(r => r.calendar_date === date && r.band === band);
    if (matched.length !== 1 || matched[0].data.length !== 25 || !matched[0].data.every(Number.isInteger))
      throw new Error(`Unexpected band ${band} on ${date}`);
  }
  return { source: modisUrl, product: "MOD11A2.061", tile: rows[0].tile, cellM: Number(raw.cellsize),
    bounds: { xllcorner: Number(raw.xllcorner), yllcorner: Number(raw.yllcorner), rows: 5, cols: 5 },
    dates, rows };
}

const radians = Math.PI / 180;
const radius = 1737.4;
const rho = 2 * Math.tan((moon[1] + 90) * radians / 2);
const cx = rho * Math.sin(moon[0] * radians), cy = rho * Math.cos(moon[0] * radians);
const half = 2 / radius;

async function diviner(bin) {
  const product = `pcp_avg_tbol_pols_sum_ltim${bin}_240`;
  const source = base + product + ".tab", labelUrl = base + product + ".lbl";
  const label = await (await get(labelUrl)).text();
  const field = key => label.match(new RegExp(`^\\s*${key}\\s*=\\s*([^\\r\\n]+)`, "m"))?.[1].trim();
  const bytes = Number(field("RECORD_BYTES")), records = Number(field("FILE_RECORDS"));
  const hourStart = parseFloat(field("LRO:DLRE_CLOCTIME_MIN")), hourEnd = parseFloat(field("LRO:DLRE_CLOCTIME_MAX"));
  if (bytes !== 59 || !Number.isInteger(records) || records < 2 || parseFloat(field("MAP_SCALE")) !== 240 ||
      hourStart !== (Number(bin) - 1) / 4 || hourEnd !== hourStart + .25 ||
      !label.includes("bolometric") || !label.includes("POLAR STEREOGRAPHIC")) throw new Error("Unexpected Diviner label");
  async function read(first, last) {
    const start = first * bytes, end = last * bytes - 1;
    const r = await get(source, { Range: `bytes=${start}-${end}` });
    if (r.status !== 206 || r.headers.get("content-range") !== `bytes ${start}-${end}/${records * bytes}`) {
      await r.body?.cancel();
      throw new Error("Diviner range mismatch");
    }
    const data = Buffer.from(await r.arrayBuffer());
    if (data.length !== end - start + 1) throw new Error("Truncated Diviner range");
    const rows = [];
    for (let offset = 0; offset < data.length; offset += bytes) {
      const row = data.toString("ascii", offset, offset + bytes).trim().split(",").map(Number);
      if (row.length !== 5 || !row.every(Number.isFinite)) throw new Error("Malformed Diviner row");
      rows.push(row);
    }
    return { rows, start, end, sha256: hash(data) };
  }
  async function lower(x) {
    let lo = 1, hi = records;
    while (hi - lo > 2048) {
      const mid = Math.floor((lo + hi) / 2);
      if ((await read(mid, mid + 1)).rows[0][0] < x) lo = mid + 1;
      else hi = mid;
    }
    const { rows } = await read(lo, hi);
    const i = rows.findIndex(r => r[0] >= x);
    return i === -1 ? hi : lo + i;
  }
  const [lo, hi] = await Promise.all([lower(cx - half), lower(cx + half)]);
  if (hi <= lo || hi - lo > 100000) throw new Error("Unexpected Diviner spatial range");
  const { rows, ...range } = await read(lo, hi);
  if (rows.some((r, i) => i && r[0] < rows[i - 1][0])) throw new Error("Unsorted Diviner table");
  const selected = rows.filter(([x, y, lon, lat, k]) => Math.abs(x-cx) <= half && Math.abs(y-cy) <= half &&
    Math.abs(lon-moon[0]) < 2 && Math.abs(lat-moon[1]) < .1 && k > 0 && k < 450);
  return { product, source, labelUrl, labelSha256: hash(label), range, hourStart, hourEnd, cellM: 240,
    observedFrom: field("START_TIME"), observedTo: field("STOP_TIME"), rows: selected };
}

const [earth, lunarDay, lunarNight] = await Promise.all([modis(), diviner("49"), diviner("91")]);
const bundle = { candidateId: pilot.candidateId, referenceId: pilot.referenceId, retrievedAt: new Date().toISOString(),
  earth, moon: [lunarDay, lunarNight], lunarWindow: { centerLonLat: moon, centerXY: [cx, cy], halfWidthKm: 2, radiusKm: radius } };
await writeFile(new URL("../data/pilot-thermal.json", import.meta.url), JSON.stringify(bundle) + "\n");
console.log("MODIS composites:", earth.dates, "Diviner bins:", bundle.moon.map(p => p.rows.length));
