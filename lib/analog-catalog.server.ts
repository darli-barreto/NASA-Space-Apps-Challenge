import { algorithmVersion, candidateFromFeature, catalogUrl, volcanicUnits } from "./analog-search";
import type { AnalogCatalog, CatalogFeature } from "./analog-search";
import catalogArchive from "@/data/catalog-validation.json";

export const archivedAnalogCatalog: AnalogCatalog = { ...catalogArchive, archived: true };

let cached: { at: number; promise: Promise<AnalogCatalog> } | undefined;
export function getAnalogCatalog(): Promise<AnalogCatalog> {
  if (cached && Date.now() - cached.at < 86400000) return cached.promise;
  const promise = loadCatalog().catch(() => {
    cached = undefined;
    return archivedAnalogCatalog;
  });
  cached = { at: Date.now(), promise };
  return promise;
}
async function loadCatalog(): Promise<AnalogCatalog> {
  const base = { f: "json", where: `etiqueta IN (${Object.keys(volcanicUnits).map(k => `'${k}'`).join(",")})` };
  const query = `${catalogUrl}/query?${new URLSearchParams({ ...base, outFields: "objectid,etiqueta,subunidad", returnGeometry: "true", outSR: "4326", geometryPrecision: "6", maxAllowableOffset: "0.0001", resultRecordCount: "2000", orderByFields: "objectid" })}`;
  const countQuery = `${catalogUrl}/query?${new URLSearchParams({ ...base, returnCountOnly: "true" })}`;
  const [data, count] = await Promise.all([query, countQuery].map(async url => {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000), next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`INGEMMET: HTTP ${response.status}`);
    const value = await response.json();
    if (value.error) throw new Error("INGEMMET rechazó la consulta.");
    return value;
  }));
  if (!Array.isArray(data.features) || !Number.isInteger(count.count) || count.count < 0 || data.exceededTransferLimit === true || data.features.length !== count.count) throw new Error("Catálogo incompleto o modificado durante la consulta. No se presenta una clasificación global con un subconjunto silencioso; reintenta.");
  const converted = (data.features as CatalogFeature[]).map(candidateFromFeature);
  const candidates = converted.filter(c => c !== null);
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error("Identificadores duplicados en la fuente.");
  return { algorithm: algorithmVersion, candidates, total: count.count, invalid: count.count - candidates.length, query, countQuery, retrievedAt: new Date().toISOString(), complete: true };
}
