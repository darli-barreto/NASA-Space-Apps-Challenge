import { offsetPoint, type GeoPoint } from "./analog-math";
import { terrainMetrics } from "./terrain-metrics";

export const detailedMethod = {
  version: "nested-terrain-81-v1", side: 9, spacingM: 500, extentM: 4000,
  shortlist: 3, order: "south-to-north rows, west-to-east columns",
  scope: "Muestreo puntual multiescala; no agregación de todos los píxeles ni resolución efectiva armonizada.",
} as const;

export function detailedGrid(center: GeoPoint, radiusKm: number) {
  return Array.from({ length: 81 }, (_, i) =>
    offsetPoint(center, radiusKm, (i % 9 - 4) * .5, (Math.floor(i / 9) - 4) * .5));
}

export function detailedSummary(values: (number | null)[]) {
  if (values.length !== 81) throw new Error("Se requieren 81 muestras ordenadas.");
  const valid = values.filter(v => typeof v === "number" && Number.isFinite(v)).length;
  return {
    valid, expected: 81, sampleCoverage: valid / 81,
    scales: [1, 2, 4].map(stride => {
      const side = 8 / stride + 1;
      const subset = Array.from({ length: side ** 2 }, (_, i) =>
        values[Math.floor(i / side) * stride * 9 + i % side * stride]);
      // No infill: even a complete coarse subset cannot validate a missing dense grid.
      return { side, spacingM: stride * 500, metrics: terrainMetrics(subset, side, stride * 500) };
    }),
  };
}

export function compareDetailed(earth: (number | null)[], reference: (number | null)[]) {
  const a = detailedSummary(earth), b = detailedSummary(reference);
  return { earth: a, reference: b, complete: a.valid === 81 && b.valid === 81,
    contrasts: a.scales.map((scale, i) => {
      const x = scale.metrics, y = b.scales[i].metrics;
      return { spacingM: scale.spacingM,
        reliefDeltaM: x && y ? x.relief - y.relief : null,
        p90GradientDeltaDeg: x && y ? x.highGradient - y.highGradient : null,
        medianGradientDeltaDeg: x && y ? x.medianGradient - y.medianGradient : null,
        deviationDeltaM: x && y ? x.localDeviation - y.localDeviation : null,
      };
    }),
  };
}

export type DetailedTerrain = {
  archived?: boolean;
  candidateId: number; profileId: string; method: typeof detailedMethod;
  status: "complete" | "partial" | "unavailable";
  samples: { earth: (GeoPoint & { elevation: number | null })[]; reference: (GeoPoint & { elevation: number | null })[] };
  comparison: ReturnType<typeof compareDetailed> | null;
  provenance: { earthSource: string; referenceSource: string; referenceRetrievedAt: string;
    requestedAt: string; cacheHours: number; earthNativeM: number; referenceNativeM: number };
  limitations: string[];
};
