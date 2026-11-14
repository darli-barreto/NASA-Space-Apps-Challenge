import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const math = {};
const code = await readFile(new URL("../lib/analog-math.ts", import.meta.url), "utf8");
runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: math });

const sites = [
  { id: "kilauea", name: "Entorno de Kīlauea Iki", role: "Volcanismo documentado",
    center: { lat: 19.414, lon: -155.246 }, source: "https://science.nasa.gov/solar-system/analog-explorer/",
    coordinateContext: "Ventana aproximada elegida por TERRA en el entorno de Kīlauea Iki.",
    rationale: "NASA documenta Kīlauea como análogo de paisajes basálticos y lo presenta junto a Hadley." },
  { id: "barringer", name: "Entorno de Meteor Crater", role: "Contraste de proceso",
    center: { lat: 35.033333, lon: -111.016667 }, source: "https://pubs.usgs.gov/circ/1300/pdf/Cir1300_508.pdf",
    coordinateContext: "Centro aproximado tomado del inventario de impactos del USGS.",
    rationale: "Origen por impacto. Permite comprobar si un proceso distinto obtiene una distancia topográfica baja." },
  { id: "bonneville", name: "Salina de Bonneville", role: "Contraste de terreno plano",
    center: { lat: 40.785, lon: -113.832 }, source: "https://www.blm.gov/visit/bonneville-salt-flats",
    coordinateContext: "Ventana aproximada elegida por TERRA dentro de la salina.",
    rationale: "Costra salina extensa. Se espera un relieve bajo frente al entorno de Hadley." },
];
const points = sites.flatMap(site => math.stencil(site.center));
const query = new URLSearchParams({
  locations: points.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join("|"),
  interpolation: "bilinear", nodata_value: "null",
});
const source = `https://api.opentopodata.org/v1/srtm90m?${query}`;
const response = await fetch(source, { signal: AbortSignal.timeout(35_000) });
if (!response.ok) throw new Error(`SRTM HTTP ${response.status}`);
const raw = await response.json();
if (raw.status !== "OK" || raw.results?.length !== points.length) throw new Error("Unexpected SRTM result count");
const samples = raw.results.map((row, i) => {
  const p = points[i];
  if (row.dataset !== "srtm90m" || !Number.isFinite(row.location?.lat) || !Number.isFinite(row.location?.lng) ||
      Math.abs(row.location.lat-p.lat) > 2e-6 || Math.abs(row.location.lng-p.lon) > 2e-6)
    throw new Error("Unexpected SRTM sample location");
  const z = row.elevation;
  return { ...p, elevation: Number.isFinite(z) && z >= -500 && z <= 9000 ? z : null };
});
const controls = sites.map((site, i) => ({ ...site, samples: samples.slice(i*9, (i+1)*9) }));
await writeFile(new URL("../data/terrain-controls.json", import.meta.url), JSON.stringify({
  source, retrievedAt: new Date().toISOString(), spacingKm: 2, controls,
}, null, 2) + "\n");
console.log(controls.map(site => [site.id, math.signature(site.samples)]));
