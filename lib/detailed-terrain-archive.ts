import archive from "../data/detailed-terrain.json";
import { detailedMethod, type DetailedTerrain } from "./detailed-terrain";
import type { GeoPoint } from "./analog-math";

export function archivedDetailedTerrain(candidateId: number, profileId: string,
  earth: GeoPoint[], reference: (GeoPoint & { elevation: number | null })[]) {
  const saved = (archive.observations as unknown as DetailedTerrain[]).find(row =>
    row.candidateId === candidateId && row.profileId === profileId &&
    row.method.version === detailedMethod.version && row.status === "complete");
  if (!saved || saved.samples.earth.length !== 81 || saved.samples.reference.length !== 81) return null;
  const samePoint = (a: GeoPoint, b: GeoPoint) => a.lat === b.lat && a.lon === b.lon;
  if (!earth.every((p,i) => samePoint(p,saved.samples.earth[i])) ||
      !reference.every((p,i) => samePoint(p,saved.samples.reference[i]) && p.elevation === saved.samples.reference[i].elevation)) return null;
  return { ...saved, archived: true };
}
