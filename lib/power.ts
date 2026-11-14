// Refuse unknown units instead of silently assigning familiar labels to values.
export function parsePower(d: {
  header?: { fill_value?: number; range?: string };
  parameters?: Record<string, { units?: string }>;
  properties?: { parameter?: Record<string, Record<string, number>> };
}, source: string) {
  const p = d.properties?.parameter;
  if (!p) throw new Error("NASA POWER: respuesta sin parámetros.");
  const expected = { T2M: "C", PRECTOTCORR: "mm/day", WS10M: "m/s" };
  for (const [key, unit] of Object.entries(expected)) if (d.parameters?.[key]?.units !== unit) throw new Error(`NASA POWER: unidad inesperada para ${key}. No se interpretaron los valores.`);
  const clean = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && v !== (d.header?.fill_value ?? -999) ? v : null;
  const climate = { temperature: clean(p.T2M?.ANN), precipitation: clean(p.PRECTOTCORR?.ANN), wind: clean(p.WS10M?.ANN), months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].map(m => clean(p.T2M?.[m])), period: d.header?.range ?? "Período no informado por el servicio", resolution: "Celda MERRA-2 aprox. 0,5° × 0,625°; no resuelve el radio seleccionado.", source };
  if ([climate.temperature, climate.precipitation, climate.wind, ...climate.months].every(v => v === null)) throw new Error("NASA POWER: todos los valores están ausentes.");
  return climate;
}
