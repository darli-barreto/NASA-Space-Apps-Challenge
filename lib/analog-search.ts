import type { DetailedTerrain } from "./detailed-terrain";
import { algorithmVersion, interiorCenter, insideRings, stencil, terrainDistance, terrainDistanceBreakdown } from "./analog-math";
import type { ElevationPoint, TerrainSignature } from "./analog-math";

export const catalogUrl = "https://geocatminnube.ingemmet.gob.pe/arcgis/rest/services/SERV_GEOMORFOLOGIA/MapServer/0";
export const volcanicUnits: Record<string, string> = {
  "Ca-la": "Coladas o campo de lavas basalto-andesíticas",
  "M-vl": "Meseta volcánica lávica",
  "L-fl": "Ladera con flujo de lava asociada a estrato-volcán",
};
export type CatalogFeature = { attributes?: Record<string, unknown>; geometry?: { rings?: number[][][] } };
export type AnalogCandidate = { id: number; unit: string; description: string; lat: number; lon: number; gridInside: number; samples: ElevationPoint[]; bounds: number[]; source: string; geology: string; mineralogy: string };
export type AnalogCatalog = { algorithm: string; candidates: AnalogCandidate[]; total: number; invalid: number; query: string; countQuery: string; retrievedAt: string; complete: boolean; archived?: boolean };
export type Contrast = { detailed?: DetailedTerrain; id: number; signature: TerrainSignature | null; distance: number | null; samples: ElevationPoint[]; reason: string | null; source: string; retrievedAt: string; archived?: boolean };
export function candidateFromFeature(f: CatalogFeature): AnalogCandidate | null {
  const a = f.attributes, rings = f.geometry?.rings;
  if (!a || !Number.isInteger(a.objectid) || typeof a.etiqueta !== "string" || !Object.hasOwn(volcanicUnits, a.etiqueta) || !Array.isArray(rings) || !rings.length) return null;
  if (rings.some(r => !Array.isArray(r) || r.length < 4 || r.some(p => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90))) return null;
  const center = interiorCenter(rings);
  if (!center) return null;
  const samples = stencil(center).map(p => ({ ...p, elevation: null }));
  const bounds = rings.flat().reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
  const id = a.objectid as number;
  return { id, unit: a.etiqueta, description: String(a.subunidad ?? volcanicUnits[a.etiqueta]), ...center, samples, gridInside: samples.filter(p => insideRings(p, rings)).length, bounds,
    source: `${catalogUrl}/query?${new URLSearchParams({ f: "pjson", objectIds: String(id), outFields: "*", returnGeometry: "true", outSR: "4326" })}`,
    geology: "Coincidencia de proceso: terreno lávico cartografiado. Clasificación de INGEMMET; interpretación de analogía de TERRA.",
    mineralogy: a.etiqueta === "Ca-la" ? "Unidad basalto-andesítica: composición mixta, no equivalencia demostrada con basalto planetario." : "Composición mineralógica no determinada por esta clase geomorfológica.",
  };
}
export function rankedContrasts(results: Contrast[], reference: TerrainSignature) {
  const valid = results.flatMap(row => {
    const score = terrainDistanceBreakdown(row.signature, reference);
    return score ? [{ ...row, distance: score.distance, score }] : [];
  });
  const weights = [.25, .5, .75];
  const orders = weights.map(w => valid.map(r => ({ id: r.id, d: terrainDistance(r.signature, reference, w)! })).sort((a, b) => a.d - b.d || a.id - b.id));
  return valid.map(r => {
    const ranks = orders.map(order => 1 + order.filter(item => item.d < order.find(x => x.id === r.id)!.d - 1e-9).length);
    return { ...r, rankMin: Math.min(...ranks), rankMax: Math.max(...ranks) };
  }).sort((a, b) => a.distance - b.distance || a.id - b.id);
}
export { algorithmVersion };
