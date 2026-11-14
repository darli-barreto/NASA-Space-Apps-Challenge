import raw from "@/data/pilot-thermal.json";
import { modisKelvin, thermalSummary } from "./thermal-metrics";

export const pilotThermal = raw;
export const earthThermal = (["Day", "Night"] as const).map(phase => {
  const values: number[] = [];
  const hours: number[] = [];
  let strictCount = 0;
  for (const date of raw.earth.dates) {
    const band = (name: string) => raw.earth.rows.find(row => row.calendar_date === date && row.band === name)?.data ?? [];
    const qc = band(`QC_${phase}`), time = band(`${phase}_view_time`);
    band(`LST_${phase}_1km`).forEach((dn, index) => {
      const kelvin = modisKelvin(dn, qc[index], true);
      if (kelvin === null) return;
      if (modisKelvin(dn, qc[index]) !== null) strictCount++;
      values.push(kelvin);
      if (time[index] > 0 && time[index] <= 240) hours.push(time[index] * .1);
    });
  }
  return {
    phase, statistics: thermalSummary(values), strictCount,
    possibleCount: raw.earth.dates.length * raw.earth.bounds.rows * raw.earth.bounds.cols,
    observedLocalHours: hours.length ? [Math.min(...hours), Math.max(...hours)] : null,
  };
});
export const lunarThermal = raw.moon.map(bin => ({
  ...bin, statistics: thermalSummary(bin.rows.map(row => row[4])),
}));
