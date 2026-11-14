import { type Analysis, validSite } from "./analysis";

const finiteOrNull = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));

export function readSavedReports(raw: string): Analysis[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data.filter((a): a is Analysis => {
      if (!a || typeof a.id !== "string" || seen.has(a.id) || !a.site || !validSite(a.site) ||
          typeof a.created !== "string" || !Number.isFinite(Date.parse(a.created)) ||
          !Array.isArray(a.warnings) || !a.warnings.every((v: unknown) => typeof v === "string")) return false;
      const s = a.settings;
      if (!s || !["Luna", "Marte"].includes(s.target) ||
          !["Movilidad robótica", "Operaciones humanas", "Procesos ambientales"].includes(s.task) ||
          !Number.isFinite(s.relief) || s.relief < 0 || s.relief > 10000 ||
          !Number.isFinite(s.rain) || s.rain < 0 || s.rain > 100) return false;
      const c = a.climate, t = a.terrain;
      if (c !== null && (!c || ![c.temperature, c.precipitation, c.wind].every(finiteOrNull) ||
          !Array.isArray(c.months) || c.months.length !== 12 || !c.months.every(finiteOrNull) ||
          ![c.period, c.source, c.resolution].every(v => typeof v === "string"))) return false;
      if (t !== null && (!t || !finiteOrNull(t.relief) || !Number.isFinite(t.coverage) ||
          t.coverage < 0 || t.coverage > 1 || typeof t.source !== "string" || !Array.isArray(t.samples) ||
          !t.samples.every((p: { lat: number; lon: number; elevation: unknown }) => p &&
            Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && Number.isFinite(p.lon) && Math.abs(p.lon) <= 180 && finiteOrNull(p.elevation)))) return false;
      seen.add(a.id);
      return true;
    }).slice(0, 20);
  } catch { return []; }
}
