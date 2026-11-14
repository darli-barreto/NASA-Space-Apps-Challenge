import { rankedContrasts, type Contrast } from "./analog-search";
import type { PlanetaryProfile } from "./planetary";
import { detailedMethod, type DetailedTerrain } from "./detailed-terrain";

/** Refinement is descriptive and must never replace or discard the screening results. */
export async function refineCandidates(
  results: Contrast[], profile: PlanetaryProfile, archivedCatalog: boolean,
  signal: AbortSignal, receive: (result: DetailedTerrain) => void,
) {
  const shortlist = rankedContrasts(results, profile.signature).slice(0, detailedMethod.shortlist);
  for (const row of shortlist) {
    if (signal.aborted) return;
    if (row.detailed?.profileId === profile.id && row.detailed.status === "complete") continue;
    try {
      const response = await fetch("/api/analog-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: profile.id, ids: [row.id], archivedCatalog, detail: true }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(40000)]),
      });
      if (!response.ok) continue;
      const data: DetailedTerrain = await response.json();
      if (!signal.aborted && data.profileId === profile.id && data.candidateId === row.id &&
          data.method?.version === detailedMethod.version) receive(data);
    } catch {
      // Absence of a detail record means not completed; never invent a successful result.
      if (signal.aborted) return;
    }
  }
}
