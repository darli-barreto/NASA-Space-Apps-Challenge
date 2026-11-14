import raw from "@/data/pilot-thermal.json";
import { thermalSummary } from "./thermal-metrics";
import { summarizeModis } from "./modis-thermal";

export const pilotThermal = raw;
export const earthThermal = summarizeModis(raw.earth.rows, raw.earth.dates, raw.earth.bounds.rows * raw.earth.bounds.cols, true);
export const lunarThermal = raw.moon.map(bin => ({
  ...bin, statistics: thermalSummary(bin.rows.map(row => row[4])),
}));
