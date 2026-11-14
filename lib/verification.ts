import { terrainDistance } from './analog-math';
import type { TerrainSignature } from './analog-math';
import type { Contrast } from './analog-search';

// Conservative envelopes under a USER-ASSUMED bound per elevation sample.
// These are not DEM accuracy estimates or statistical confidence intervals.
function envelope(s: TerrainSignature, errorM: number) {
  const dz = 2 * errorM;
  const run = s.spacingKm * 1000;
  const rise = Math.tan(s.p90GradientDeg * Math.PI / 180) * run;
  return { r: [Math.max(0, s.reliefM - dz), s.reliefM + dz],
    g: [Math.atan(Math.max(0, rise - dz) / run) * 180 / Math.PI, Math.atan((rise + dz) / run) * 180 / Math.PI] };
}
function term(a: number[], b: number[], floor: number) {
  const corners = a.flatMap(x => b.map(y => Math.abs(x-y)/(x+y+floor)));
  return [a[0] <= b[1] && b[0] <= a[1] ? 0 : Math.min(...corners), Math.max(...corners)];
}
export function verificationBounds(results: Contrast[], reference: TerrainSignature, earthErrorM: number, referenceErrorM: number) {
  if (![earthErrorM, referenceErrorM].every(n => Number.isFinite(n) && n >= 0 && n <= 1000)) return [];
  const ref = envelope(reference, referenceErrorM);
  const rows = results.filter(r => terrainDistance(r.signature, reference) !== null).map(r => {
    const s = envelope(r.signature!, earthErrorM), relief = term(s.r, ref.r, 10), gradient = term(s.g, ref.g, .1);
    const lower = [.25,.5,.75].map(w => w*relief[0]+(1-w)*gradient[0]);
    const upper = [.25,.5,.75].map(w => w*relief[1]+(1-w)*gradient[1]);
    return { id:r.id, distanceMin:Math.min(...lower), distanceMax:Math.max(...upper) };
  });
  return rows.map(r => ({ ...r,
    rankBest:1+rows.filter(o => o.id!==r.id && o.distanceMax < r.distanceMin-1e-9).length,
    rankWorst:1+rows.filter(o => o.id!==r.id && o.distanceMin < r.distanceMax-1e-9).length,
  }));
}

export const verificationGates = [
  'Hipótesis, región planetaria y experimento definidos',
  'DEM armonizados y análisis de ventanas, centros y escalas',
  'Geología y materiales contrastados con evidencia independiente',
  'Controles positivos y negativos independientes evaluados',
  'Bibliografía y novedad documentadas',
  'Observaciones de campo o laboratorio según la afirmación',
  'Utilidad operativa medida y revisión de especialista',
];
