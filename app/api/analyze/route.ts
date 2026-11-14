import { srtm } from "@/lib/srtm.server";
import { Analysis, Settings, Site, sampleGrid, summarizeTerrain, validSite } from "@/lib/analysis";
import { parsePower } from "@/lib/power";
export const maxDuration = 60;
async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(22000), next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export async function POST(request: Request) {
  let body: { site: Site; settings: Settings };
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud JSON inválida." }, { status: 400 }); }
  const { site, settings } = body ?? {};
  if (!site || !validSite(site) || !settings || !["Luna", "Marte"].includes(settings.target) || !["Movilidad robótica", "Operaciones humanas", "Procesos ambientales"].includes(settings.task) || !Number.isFinite(settings.relief) || settings.relief < 0 || settings.relief > 10000 || !Number.isFinite(settings.rain) || settings.rain < 0 || settings.rain > 100) return Response.json({ error: "Revisa coordenadas, radio (1–25 km) y criterios." }, { status: 400 });
  const power = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
  power.search = new URLSearchParams({ parameters: "T2M,PRECTOTCORR,WS10M", community: "AG", longitude: String(site.lon), latitude: String(site.lat), format: "JSON" }).toString();
  const grid = sampleGrid(site);
  const topo = `https://api.opentopodata.org/v1/srtm90m?locations=${grid.map(s => `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`).join("|")}&interpolation=bilinear&nodata_value=null`;
  const results = await Promise.allSettled([getJson(power.href), srtm(topo)]);
  const a: Analysis = { id: crypto.randomUUID(), site, settings, created: new Date().toISOString(), climate: null, terrain: null, warnings: [] };
  const clean = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) ? v : null;
  if (results[0].status === "fulfilled") {
    try { a.climate = parsePower(results[0].value, power.href); }
    catch (e) { a.warnings.push(e instanceof Error ? e.message : "POWER no interpretable."); }
  }
  if (!a.climate) a.warnings.push("NASA POWER no respondió con datos utilizables. Reintenta; no se sustituyeron por valores simulados.");
  if (results[1].status === "fulfilled" && results[1].value?.status === "OK" && Array.isArray(results[1].value.results) && results[1].value.results.length === grid.length) {
    const elevations = results[1].value.results;
    const samples = grid.map((s, i) => ({ ...s, elevation: elevations[i]?.dataset === "srtm90m" && Math.abs((elevations[i]?.location?.lat ?? NaN) - s.lat) < .00002 && Math.abs((elevations[i]?.location?.lng ?? NaN) - s.lon) < .00002 ? clean(elevations[i].elevation) : null }));
    a.terrain = { samples, ...summarizeTerrain(samples), source: topo };
    if (a.terrain.coverage < 1) a.warnings.push("SRTM tiene cobertura incompleta. No se evalúa el criterio de relieve con muestras faltantes.");
  } else a.warnings.push("SRTM no disponible: servicio limitado o área sin cobertura. No se infiere topografía desde la imagen.");
  a.provenance = { retrievedAt: new Date().toISOString(), power: results[0].status === "fulfilled" ? results[0].value : null, srtm: results[1].status === "fulfilled" ? results[1].value : null, terrainMethod: "9 puntos geodésicos; max − min de elevaciones válidas; interpolación bilinear; metros EGM96; no pendiente ni rugosidad; observación SRTM de febrero de 2000", terrainProvider: "Open Topo Data (independiente); origen SRTM NASA/NGA, distribución oficial NASA/USGS" };
  return Response.json(a);
}
