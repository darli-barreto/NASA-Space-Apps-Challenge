/** Pure, versioned screening mathematics. Distances are not probabilities. */
export const algorithmVersion = "terrain-screen-1.0.0";
export type GeoPoint = { lat: number; lon: number };
export type ElevationPoint = GeoPoint & { elevation: number | null };
export type TerrainSignature = { reliefM: number; medianGradientDeg: number; p90GradientDeg: number; valid: number; spacingKm: number };
const rad = Math.PI / 180;

export function stencil(center: GeoPoint, radiusKm = 6371, spacingKm = 2): GeoPoint[] {
  return [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x =>
    offsetPoint(center, radiusKm, x * spacingKm, y * spacingKm)));
}

export function offsetPoint(center: GeoPoint, radiusKm: number, eastKm: number, northKm: number): GeoPoint {
  const d = Math.hypot(eastKm, northKm) / radiusKm, bearing = Math.atan2(eastKm, northKm);
  const lat = center.lat * rad, lon = center.lon * rad;
  const phi = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing));
  const lambda = lon + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(phi));
  return { lat: phi / rad, lon: ((lambda / rad + 540) % 360) - 180 };
}
export function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b), p = (sorted.length - 1) * q;
  return sorted[Math.floor(p)] + (sorted[Math.ceil(p)] - sorted[Math.floor(p)]) * (p % 1);
}
export function signature(points: ElevationPoint[], spacingKm = 2): TerrainSignature | null {
  // Missing elevations never become zero and never produce a comparable score.
  if (points.length !== 9 || points.some(p => p.elevation === null || !Number.isFinite(p.elevation)) || !Number.isFinite(spacingKm) || !(spacingKm > 0)) return null;
  const z = points.map(p => p.elevation as number), gradients: number[] = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const i = y * 3 + x;
    if (x < 2) gradients.push(Math.atan(Math.abs(z[i + 1] - z[i]) / (spacingKm * 1000)) / rad);
    if (y < 2) gradients.push(Math.atan(Math.abs(z[i + 3] - z[i]) / (spacingKm * 1000)) / rad);
  }
  return { reliefM: Math.max(...z) - Math.min(...z), medianGradientDeg: quantile(gradients, .5), p90GradientDeg: quantile(gradients, .9), valid: 9, spacingKm };
}
export function terrainDistanceBreakdown(a: TerrainSignature | null, b: TerrainSignature | null, reliefWeight = .5) {
  if (!a || !b || a.valid !== 9 || b.valid !== 9 || a.spacingKm !== b.spacingKm || !Number.isFinite(a.spacingKm) || a.spacingKm <= 0 || !Number.isFinite(reliefWeight) || reliefWeight < 0 || reliefWeight > 1) return null;
  if ([a.reliefM, b.reliefM, a.p90GradientDeg, b.p90GradientDeg].some(v => !Number.isFinite(v) || v < 0)) return null;
  // Symmetric bounded distances. Floors are declared numerical regularizers, not NASA mission requirements.
  const relief = Math.abs(a.reliefM - b.reliefM) / (a.reliefM + b.reliefM + 10);
  const gradient = Math.abs(a.p90GradientDeg - b.p90GradientDeg) / (a.p90GradientDeg + b.p90GradientDeg + .1);
  const gradientWeight = 1 - reliefWeight;
  const metrics = [
    { id: "reliefM", earth: a.reliefM, reference: b.reliefM, weight: reliefWeight, contribution: reliefWeight * relief },
    { id: "p90GradientDeg", earth: a.p90GradientDeg, reference: b.p90GradientDeg, weight: gradientWeight, contribution: gradientWeight * gradient },
  ] as const;
  return { metrics, distance: metrics[0].contribution + metrics[1].contribution };
}

export function terrainDistance(a: TerrainSignature | null, b: TerrainSignature | null, reliefWeight = .5): number | null {
  return terrainDistanceBreakdown(a, b, reliefWeight)?.distance ?? null;
}

export function insideRings(p: GeoPoint, rings: number[][][]) {
  // Even-odd rule handles holes and disjoint parts independently of winding.
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lon < (xj - xi) * (p.lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function interiorCenter(rings: number[][][]): GeoPoint | null {
  const points = rings.flat();
  if (!points.length) return null;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const west = Math.min(...xs), east = Math.max(...xs), south = Math.min(...ys), north = Math.max(...ys);
  if (west === east || south === north) return null;
  const options: GeoPoint[] = [{ lat: (south + north) / 2, lon: (west + east) / 2 }];
  // Interior scan lines avoid choosing a bounding-box center outside a concave polygon.
  for (let k = 1; k < 20; k++) {
    const lat = south + (north - south) * k / 20, cross: number[] = [];
    for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > lat) !== (yj > lat)) cross.push(xi + (lat - yi) * (xj - xi) / (yj - yi));
    }
    cross.sort((a, b) => a - b);
    for (let k = 0; k + 1 < cross.length; k += 2) options.push({ lat, lon: (cross[k] + cross[k + 1]) / 2 });
  }
  let best: GeoPoint | null = null, count = -1;
  for (const p of options) if (insideRings(p, rings)) {
    const coverage = stencil(p).filter(q => insideRings(q, rings)).length;
    if (coverage > count) { count = coverage; best = p; }
    if (count === 9) break;
  }
  return best;
}

export type RasterWindow = { north: number; west: number; ppd: number; rows: number; cols: number; values: number[]; scale: number };
export function sampleRaster(p: GeoPoint, raster: RasterWindow): number | null {
  const lon = ((p.lon % 360) + 360) % 360;
  const x = (lon - raster.west) * raster.ppd - .5, y = (raster.north - p.lat) * raster.ppd - .5;
  const x0 = Math.floor(x), y0 = Math.floor(y), dx = x - x0, dy = y - y0;
  if (x0 < 0 || y0 < 0 || x0 + 1 >= raster.cols || y0 + 1 >= raster.rows) return null;
  const v = [raster.values[y0 * raster.cols + x0], raster.values[y0 * raster.cols + x0 + 1], raster.values[(y0 + 1) * raster.cols + x0], raster.values[(y0 + 1) * raster.cols + x0 + 1]];
  if (v.some(n => !Number.isFinite(n) || n === -32768)) return null;
  return (v[0] * (1 - dx) * (1 - dy) + v[1] * dx * (1 - dy) + v[2] * (1 - dx) * dy + v[3] * dx * dy) * raster.scale;
}
