import archive from "../data/contrast-validation.json";
import type { AnalogCandidate } from "./analog-search";

const observations = new Map(archive.flatMap(batch => batch.results.map((row, index) => [
  row.id, {
    rows: batch.raw.results.slice(index * 9, index * 9 + 9),
    source: row.source,
    retrievedAt: row.retrievedAt,
  },
] as const)));

export function rawSampleMatches(
  sample: { lat: number; lon: number },
  row: { dataset?: string; location?: { lat: number; lng: number } } | null | undefined,
) {
  return row?.dataset === "srtm90m" &&
    row.location?.lat === Number(sample.lat.toFixed(6)) &&
    row.location?.lng === Number(sample.lon.toFixed(6));
}

export function archivedElevations(candidates: AnalogCandidate[]) {
  const matches = candidates.map(candidate => {
    const observation = observations.get(candidate.id);
    return observation?.rows.length === candidate.samples.length &&
      candidate.samples.every((sample, index) => rawSampleMatches(sample, observation.rows[index]))
      ? observation : undefined;
  });
  if (matches.some(match => !match)) return undefined;
  return matches.filter(match => match !== undefined);
}
