import { modisKelvin, thermalSummary } from "./thermal-metrics";

export type ModisBand = { band: string; calendar_date: string; data: number[] };
export const modisDates = ["2026-01-01", "2026-01-09", "2026-01-17", "2026-01-25"];
export const modisBands = ["LST_Day_1km", "LST_Night_1km", "QC_Day", "QC_Night", "Day_view_time", "Night_view_time"];

export function modisSource(lat: number, lon: number) {
  return "https://modis.ornl.gov/rst/api/v1/MOD11A2/subset?" + new URLSearchParams({
    latitude: lat.toFixed(6), longitude: lon.toFixed(6),
    startDate: "A2026001", endDate: "A2026025", kmAboveBelow: "2", kmLeftRight: "2",
  });
}

export function summarizeModis(rows: ModisBand[], dates = modisDates, cells = 25, includeFlagged = false) {
  const byDateAndBand = new Map(rows.map(row => [row.calendar_date + ":" + row.band, row.data]));
  return (["Day", "Night"] as const).map(phase => {
    const kelvin: number[] = [];
    const hours: number[] = [];
    let strictCount = 0;
    for (const date of dates) {
      const band = (name: string) => byDateAndBand.get(date + ":" + name) ?? [];
      const qc = band("QC_" + phase);
      const time = band(phase + "_view_time");
      band("LST_" + phase + "_1km").forEach((dn, i) => {
        const value = modisKelvin(dn, qc[i], includeFlagged);
        if (value === null) return;
        kelvin.push(value);
        if (modisKelvin(dn, qc[i]) !== null) strictCount++;
        if (time[i] > 0 && time[i] < 240) hours.push(time[i] * .1);
      });
    }
    return {
      phase, statistics: thermalSummary(kelvin), strictCount, possibleCount: dates.length * cells,
      observedLocalHours: hours.length ? [Math.min(...hours), Math.max(...hours)] : null,
    };
  });
}
