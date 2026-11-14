import { terrainMetrics } from "./terrain-metrics";

type Grid = { id: string; values: readonly (number | null)[] };

export function terrainSensitivity(grids: Grid[], side: number, spacingM: number) {
  if (side !== 9 || !Number.isFinite(spacingM) || spacingM <= 0 ||
      grids.some(grid => grid.values.length !== side ** 2)) return [];

  const steps = [-2, 0, 2];
  const scenarios = [
    ...[1, 2, 4].map(stride => ({ group: "spacing", x: 0, y: 0, stride, width: 8 / stride + 1 })),
    ...steps.flatMap(y => steps.map(x => ({ group: "window", x, y, stride: 1, width: 5 }))),
  ];
  return scenarios.map(({ group, x, y, stride, width }) => {
    const half = (width - 1) * stride / 2;
    const indices = Array.from({ length: width ** 2 }, (_, i) => {
      const row = 4 + y - half + Math.floor(i / width) * stride;
      const col = 4 + x - half + (i % width) * stride;
      return row * side + col;
    });
    const stepM = spacingM * stride;
    const products = grids.map(grid => ({
      id: grid.id,
      metrics: terrainMetrics(indices.map(i => grid.values[i]), width, stepM),
    }));
    const lunar = products.find(product => product.id === "lola")?.metrics;
    const contrasts = products.filter(product => product.id !== "lola").map(({ id, metrics }) => ({
      id,
      reliefDeltaM: metrics && lunar ? metrics.relief - lunar.relief : null,
      gradientDeltaDeg: metrics && lunar ? metrics.highGradient - lunar.highGradient : null,
    }));
    return {
      group, offsetEastM: x * spacingM, offsetNorthM: y * spacingM,
      spacingM: stepM, width, extentM: (width - 1) * stepM, indices, products, contrasts,
    };
  });
}
