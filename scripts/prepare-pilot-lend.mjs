import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const stem = "https://pds-geosciences.wustl.edu/lro/lro-l-lend-2-edr-v1/lrolen_0xxx/data/2011/20111211/lend_rdr_alds_20111211";
const labelUrl = stem + ".xml";
const source = stem + ".dat";
const reference = JSON.parse(await readFile(new URL("../data/planetary/moon-mons-mouton.json", import.meta.url), "utf8"));
const hash = value => createHash("sha256").update(value).digest("hex");

async function fetchProduct(url, range) {
  const options = () => ({ headers: range ? { Range: `bytes=${range.start}-${range.end}` } : {}, signal: AbortSignal.timeout(18_000) });
  const response = await fetch(url, options()).catch(() => fetch(url, options()));
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  if (range && (response.status !== 206 || response.headers.get("content-range") !==
      `bytes ${range.start}-${range.end}/4464000`)) {
    await response.body?.cancel();
    throw new Error("ALDS range mismatch");
  }
  return Buffer.from(await response.arrayBuffer());
}

const size = 310;
const firstRecord = 9 * 720;
const range = { start: firstRecord * size, end: 12 * 720 * size - 1 };
const labelBytes = await fetchProduct(labelUrl);
const data = await fetchProduct(source, range);
const label = labelBytes.toString("utf8");
if (data.length !== range.end - range.start + 1 || !label.includes("<records>14400</records>") ||
    !label.includes('<record_length unit="byte">310</record_length>') ||
    !label.includes('<offset unit="byte">0</offset>')) throw new Error("Unexpected ALDS layout");

function offset(name, location) {
  const field = [...label.matchAll(/<Field_Binary>[\s\S]*?<\/Field_Binary>/g)]
    .find(([entry]) => entry.includes(`<name>${name}</name>`))?.[0];
  if (!field?.includes(`<field_location unit="byte">${location}</field_location>`) ||
      !field.includes("<data_type>IEEE754MSBSingle</data_type>") ||
      !field.includes('<field_length unit="byte">4</field_length>'))
    throw new Error(`Unexpected ALDS field: ${name}`);
  return location - 1;
}
const latOffset = offset("LUNARCENTRIC_LATITUDE", 47);
const lonOffset = offset("LUNARCENTIC_EAST_LONGITUDE", 51);
const rateOffset = offset("CSETN_RATE", 111);
const errorOffset = offset("CSETN_ERR", 115);
const exposureOffset = offset("CSETN_EXPOSURE", 107);
const deltaLon = (a,b) => Math.abs(((a - b + 540) % 360) - 180);
const cells = [];

for (let byte = 0; byte < data.length; byte += size) {
  const lat = data.readFloatBE(byte + latOffset), lon = data.readFloatBE(byte + lonOffset);
  const expectedLat = -89.75 + .5 * Math.floor((firstRecord + byte / size) / 720);
  if (lat !== expectedLat || !Number.isFinite(lon) || lon < -180 || lon > 360)
    throw new Error("Invalid lunar coordinates");
  if (Math.abs(lat - reference.center.lat) > .75 || deltaLon(lon, reference.center.lon) > .75) continue;
  const exposure = data.readFloatBE(byte + exposureOffset);
  const rate = data.readFloatBE(byte + rateOffset), error = data.readFloatBE(byte + errorOffset);
  const valid = Number.isFinite(exposure) && exposure > 0 && Number.isFinite(rate) && rate >= 0 &&
    Number.isFinite(error) && error >= 0;
  cells.push({
    lat, lon, record: firstRecord + byte / size + 1,
    start: data.toString("ascii", byte, byte + 23),
    end: data.toString("ascii", byte + 23, byte + 46),
    exposureS: valid ? exposure : null, rate: valid ? rate : null, error: valid ? error : null,
  });
}
const nearest = cells.filter(cell => Math.abs(cell.lat-reference.center.lat) <= .25 &&
  deltaLon(cell.lon, reference.center.lon) <= .25);
if (cells.length < 9 || cells.length > 16 || nearest.length < 1 || nearest.length > 4 || nearest.every(c => c.rate === null))
  throw new Error("Missing or unexpected regional coverage");

await writeFile(new URL("../data/pilot-lend.json", import.meta.url), JSON.stringify({
  referenceId: reference.id, center: reference.center, source, labelUrl,
  product: "LEND_RDR_ALDS_20111211", detector: "CSETN1–4", unit: "counts/s",
  retrievedAt: new Date().toISOString(), cellDegrees: .5, range: { ...range, sha256: hash(data) }, labelSha256: hash(labelBytes),
  centerRecords: nearest.map(cell => cell.record), cells,
}, null, 2) + "\n");
console.log(nearest);
