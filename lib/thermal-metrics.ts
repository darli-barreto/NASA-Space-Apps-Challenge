import { quantile } from "./analog-math";

export function modisKelvin(dn: number, qc: number, includeFlagged = false) {
  if (!Number.isInteger(dn) || dn < 7500 || dn > 65535 || !Number.isInteger(qc) || qc < 0 || qc > 255) return null;
  const mandatory = qc & 3;
  // Flag 1 requires detailed review. Keep these values descriptive only.
  if (mandatory > (includeFlagged ? 1 : 0) || ((qc >> 2) & 3) !== 0 ||
      ((qc >> 4) & 3) > 1 || (qc >> 6) > 1) return null;
  return dn * .02;
}

export function thermalSummary(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value) && value > 0);
  return valid.length ? { count: valid.length, min: Math.min(...valid), median: quantile(valid, .5), max: Math.max(...valid) } : null;
}
