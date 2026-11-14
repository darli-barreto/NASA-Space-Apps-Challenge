import archive from "@/data/catalog-thermal.json";
import { modisBands, modisDates, modisSource, summarizeModis, type ModisBand } from "./modis-thermal";

export function archivedThermal(site: { id: number; lat: number; lon: number }) {
  return archive.sites.find(row => row.id === site.id &&
    Math.abs(row.lat - site.lat) <= 1e-6 && Math.abs(row.lon - site.lon) <= 1e-6);
}

export function thermalResult(source: string, cellM: number, rows: ModisBand[], retrievedAt: string | null) {
  return { product: archive.product, source, cellM, dates: modisDates, rows, retrievedAt,
    phases: summarizeModis(rows), inRanking: false };
}

export async function fetchModisThermal(lat: number, lon: number) {
  const source = modisSource(lat, lon);
  const response = await fetch(source, { signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error("MODIS unavailable");
  const raw = await response.json();
  const cellM = Number(raw.cellsize);
  const coordinates = [raw.latitude, raw.longitude];
  if (!coordinates.every(value => value != null && Number.isFinite(Number(value))) ||
      Math.abs(raw.latitude - lat) > 1e-6 || Math.abs(raw.longitude - lon) > 1e-6 ||
      raw.nrows !== 5 || raw.ncols !== 5 || !Number.isFinite(cellM) || cellM < 900 || cellM > 1100 ||
      !Array.isArray(raw.subset)) throw new Error("Invalid MODIS coverage");

  const rows: ModisBand[] = [];
  for (const date of modisDates) {
    for (const band of modisBands) {
      const matching = raw.subset.filter((row: ModisBand | null) => row?.band === band && row.calendar_date === date);
      if (matching.length !== 1 || !Array.isArray(matching[0].data) ||
          matching[0].data.length !== 25 || !matching[0].data.every(Number.isInteger)) {
        throw new Error("Invalid MODIS bands");
      }
      rows.push({ calendar_date: date, band, data: matching[0].data });
    }
  }
  return thermalResult(source, cellM, rows, null);
}
