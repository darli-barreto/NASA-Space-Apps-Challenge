import { quantile } from "./analog-math";

export function terrainMetrics(values: readonly (number | null)[], side: number, spacingM: number) {
  if (!Number.isInteger(side) || side < 3 || values.length !== side ** 2 ||
      !Number.isFinite(spacingM) || spacingM <= 0 ||
      !values.every((value): value is number => typeof value === "number" && Number.isFinite(value))) return null;

  const gradients: number[] = [];
  const deviations: number[] = [];
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const i = y * side + x;
    for (const neighbor of [x < side - 1 ? i + 1 : -1, y < side - 1 ? i + side : -1]) {
      if (neighbor >= 0) gradients.push(Math.atan(Math.abs(values[i] - values[neighbor]) / spacingM) * 180 / Math.PI);
    }
    if (x > 0 && x < side - 1 && y > 0 && y < side - 1) {
      const average = (values[i - 1] + values[i + 1] + values[i - side] + values[i + side]) / 4;
      deviations.push((values[i] - average) ** 2);
    }
  }
  return {
    relief: Math.max(...values) - Math.min(...values),
    centralRelief: quantile(values as number[], .9) - quantile(values as number[], .1),
    medianGradient: quantile(gradients, .5),
    highGradient: quantile(gradients, .9),
    localDeviation: Math.sqrt(deviations.reduce((sum, value) => sum + value, 0) / deviations.length),
  };
}

export const terrainMetricLabels = {
  relief: "Relieve total (m)",
  centralRelief: "Relieve P90–P10 (m)",
  medianGradient: "Gradiente mediano (°)",
  highGradient: "Gradiente P90 (°)",
  localDeviation: "Desviación respecto a vecinos (m RMS)",
} as const;
