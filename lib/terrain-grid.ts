import type { ElevationPoint } from "./analog-math";

export function terrainGrids(sites: readonly (readonly ElevationPoint[])[]) {
  const grids = sites.map(samples => {
    if (samples.length !== 9) return null;
    const valid = samples.flatMap(({ elevation }) =>
      typeof elevation === "number" && Number.isFinite(elevation) ? [elevation] : []);
    if (!valid.length) return null;
    const minimum = Math.min(...valid);
    const cells = samples.map(point => ({
      ...point,
      relativeM: typeof point.elevation === "number" && Number.isFinite(point.elevation)
        ? point.elevation - minimum : null,
    }));
    // Stencil order is south to north. Display north at the top.
    return [...cells.slice(6, 9), ...cells.slice(3, 6), ...cells.slice(0, 3)];
  });
  const maximumM = Math.max(0, ...grids.flatMap(grid => grid?.map(cell => cell.relativeM ?? 0) ?? []));
  return { grids, maximumM };
}
