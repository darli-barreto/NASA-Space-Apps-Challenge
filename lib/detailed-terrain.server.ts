import { srtm } from "./srtm.server";
import { archivedDetailedTerrain } from "./detailed-terrain-archive";
import { rawSampleMatches } from "./analog-archive";
import { sampleRaster } from "./analog-math";
import type { AnalogCandidate } from "./analog-search";
import type { PlanetaryProfile } from "./planetary";
import { compareDetailed, detailedGrid, detailedMethod, type DetailedTerrain } from "./detailed-terrain";

export async function analyzeDetailedTerrain(candidate: AnalogCandidate, profile: PlanetaryProfile,
  options: { preferArchive?: boolean; allowArchive?: boolean } = {}): Promise<DetailedTerrain> {
  const earth = detailedGrid(candidate, 6371).map(p => ({ ...p, elevation: null as number | null }));
  const reference = detailedGrid(profile.center, profile.radiusKm).map(p => ({ ...p, elevation: sampleRaster(p, profile.window) }));
  const saved = options.allowArchive === false ? null : archivedDetailedTerrain(candidate.id, profile.id, earth, reference);
  if (options.preferArchive && saved) return saved;
  const source = `https://api.opentopodata.org/v1/srtm90m?${new URLSearchParams({
    locations: earth.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join("|"),
    interpolation: "bilinear", nodata_value: "null",
  })}`;
  const base = {
    candidateId: candidate.id, profileId: profile.id, method: detailedMethod,
    samples: { earth, reference },
    provenance: { earthSource: source, referenceSource: profile.imageUrl,
      referenceRetrievedAt: profile.retrievedAt, requestedAt: new Date().toISOString(),
      cacheHours: 24, earthNativeM: 90, referenceNativeM: profile.nativeCellM },
    limitations: [detailedMethod.scope,
      "Igual extensión y separación nominal; SRTM y el modelo planetario mantienen distinta resolución nativa, soporte y error.",
      "Los gradientes son entre nodos; no pendientes locales ni transitabilidad. La desviación frente a vecinos no mide obstáculos.",
      "El filtro geomorfológico verificó los nueve nodos iniciales, no todos los nuevos nodos ni el área completa.",
      "Revisión descriptiva de una preselección; no modifica el ranking inicial ni valida analogía geológica u operativa.",
      "La cobertura indica fracción de muestras válidas, no porcentaje del área observado.",
    ],
  };
  try {
    const raw = await srtm(source);
    if (raw.results.length !== 81 || !earth.every((p, i) => rawSampleMatches(p, raw.results[i]))) {
      throw new Error("La respuesta SRTM no corresponde a los 81 puntos solicitados.");
    }
    earth.forEach((p, i) => {
      const z = raw.results[i].elevation;
      p.elevation = typeof z === "number" && Number.isFinite(z) && z >= -500 && z <= 9000 ? z : null;
    });
    const comparison = compareDetailed(earth.map(p => p.elevation), reference.map(p => p.elevation));
    return { ...base, comparison, status: comparison.complete ? "complete" : "partial" };
  } catch {
    if (saved) return saved;
    return { ...base, status: "unavailable", comparison: null,
      limitations: [...base.limitations, "Consulta detallada no disponible; no se reutilizan nueve alturas como si fueran 81."],
    };
  }
}
