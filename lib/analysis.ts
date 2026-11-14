export type Site = { name: string; lat: number; lon: number; radius: number };
export type Settings = { target: "Luna" | "Marte"; task: "Movilidad robótica" | "Operaciones humanas" | "Procesos ambientales"; relief: number; rain: number };
type Sample = { lat: number; lon: number; elevation: number | null };
export type Analysis = {
  id: string; site: Site; settings: Settings; created: string;
  climate: { temperature: number | null; precipitation: number | null; wind: number | null; months: (number | null)[]; period: string; source: string; resolution: string } | null;
  terrain: { samples: Sample[]; relief: number | null; coverage: number; source: string } | null;
  warnings: string[];
  provenance?: { retrievedAt: string; power: unknown; srtm: unknown; terrainMethod: string; terrainProvider: string };
};
export const candidates: (Site & { country: string; tag: string })[] = [
  { name: "Campo volcánico de Andagua", country: "Perú", tag: "Vulcanismo · candidato", lat: -15.50, lon: -72.33, radius: 5 },
  { name: "Pampas de La Joya", country: "Perú", tag: "Terreno árido · candidato", lat: -16.70, lon: -71.85, radius: 5 },
  { name: "Desierto de Atacama", country: "Chile", tag: "Control conocido", lat: -24.50, lon: -69.25, radius: 5 },
];
export const dimensions = [
  ["01", "Terreno y topografía", "Muestreo SRTM de elevación y relieve regional. No mide pendientes locales ni transitabilidad."],
  ["02", "Clima y extremos", "Climatología POWER del centro. No mide temperatura superficial ni extremos diarios."],
  ["03", "Geología y materiales", "Pendiente: cartografía geológica, espectros y validación de materiales."],
  ["04", "Agua, hielo y recursos", "Pendiente: evidencia específica. La precipitación no demuestra hielo o recursos accesibles."],
  ["05", "Polvo y procesos", "El viento aporta contexto; no demuestra polvo, erosión o equivalencia de procesos."],
  ["06", "Biología y habitabilidad", "Pendiente: estudios biológicos y evidencia de campo."],
  ["07", "Cuevas y subsuelo", "Pendiente: inventarios y estudios locales; no inferible de estas imágenes."],
  ["08", "Operaciones y acceso", "Pendiente: permisos, acceso, seguridad y ensayos de campo."],
];
export function validSite(s: Site) {
  return typeof s.name === "string" && s.name.trim().length > 0 && s.name.length <= 120 && Number.isFinite(s.lat) && Math.abs(s.lat) <= 90 && Number.isFinite(s.lon) && Math.abs(s.lon) <= 180 && Number.isFinite(s.radius) && s.radius >= 1 && s.radius <= 25;
}
export function sampleGrid(s: Site): Sample[] {
  const lat = s.lat * Math.PI / 180, lon = s.lon * Math.PI / 180;
  return [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => {
    const distance = Math.hypot(x, y) * s.radius / Math.sqrt(2) / 6371;
    const bearing = Math.atan2(x, y);
    const phi = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(bearing));
    const lambda = lon + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(lat), Math.cos(distance) - Math.sin(lat) * Math.sin(phi));
    return { lat: phi * 180 / Math.PI, lon: ((lambda * 180 / Math.PI + 540) % 360) - 180, elevation: null };
  }));
}
export function summarizeTerrain(samples: Sample[]) {
  const e = samples.flatMap(s => typeof s.elevation === "number" && Number.isFinite(s.elevation) ? [s.elevation] : []);
  return { relief: e.length >= 2 ? Math.max(...e) - Math.min(...e) : null, coverage: samples.length ? e.length / samples.length : 0 };
}
export function checks(a: Analysis) {
  return [
    { label: `Relieve muestreado ≤ ${a.settings.relief} m`, value: a.terrain?.relief == null || a.terrain.coverage < 1 ? null : a.terrain.relief <= a.settings.relief },
    { label: `Precipitación media ≤ ${a.settings.rain} mm/día`, value: a.climate?.precipitation == null ? null : a.climate.precipitation <= a.settings.rain },
  ];
}
export function reportText(a: Analysis) {
  return `# TERRA — Evaluación exploratoria\n\n${a.site.name}\n${a.site.lat}, ${a.site.lon} · radio ${a.site.radius} km\nGenerado: ${a.created}\nEscenario: ${a.settings.target} · ${a.settings.task}\n\n## Observaciones terrestres\nTemperatura media del aire: ${a.climate?.temperature ?? "Sin datos"} °C\nPrecipitación media: ${a.climate?.precipitation ?? "Sin datos"} mm/día\nViento medio a 10 m: ${a.climate?.wind ?? "Sin datos"} m/s\nRelieve entre muestras: ${a.terrain?.relief ?? "Sin datos"} m\nFracción de muestras válidas (no cobertura del área): ${Math.round((a.terrain?.coverage ?? 0) * 100)}%\n\n## Criterios del usuario (no validados científicamente)\n${checks(a).map(c => `${c.label}: ${c.value === null ? "No evaluable" : c.value ? "Cumple" : "No cumple"}`).join("\n")}\n\n## Fuentes\n${a.climate?.source ?? "POWER no disponible"}\nPeríodo POWER: ${a.climate?.period ?? "No disponible"}\nResolución: ${a.climate?.resolution ?? "No disponible"}\n${a.terrain?.source ?? "SRTM no disponible"}\n\n## Procedencia técnica\n${a.provenance?.terrainProvider ?? "SRTM NASA/NGA vía Open Topo Data (distribuidor independiente)"}\n${a.provenance?.terrainMethod ?? "Método no registrado en esta ficha antigua"}\nConsulta de la app: ${a.provenance?.retrievedAt ?? a.created} (servicios con caché de hasta 24 h; no fecha de observación).\nLas respuestas originales completas se conservan en la exportación JSON cuando existe provenance.\n\n## Atribución\nDatos meteorológicos: NASA POWER, NASA Langley Research Center; https://power.larc.nasa.gov/docs/referencing/\nElevaciones: SRTM NASA/NGA; distribución oficial NASA/USGS; acceso de esta app mediante Open Topo Data.\nImágenes de contexto: NASA Global Imagery Browse Services (GIBS), ESDIS; no se utilizan píxeles JPEG para obtener mediciones.\n\n## Alcance y limitaciones\n${a.warnings.join("\n")}\n${dimensions.map(d => `${d[1]}: ${d[2]}`).join("\n")}\n\nEsto es un cribado terrestre, no una certificación de analogía ni una comparación cuantitativa con datos planetarios. Luna/Marte define el contexto, no altera las mediciones. No reproduce gravedad, vacío lunar, atmósfera marciana o radiación. SRTM es un muestreo disperso de 9 puntos, no un análisis completo del área. Las medias climáticas no miden extremos. La novedad del candidato requiere revisión bibliográfica.\n\n## Utilidad propuesta y próximos pasos\nUsar las observaciones para priorizar una inspección de campo y diseñar ensayos de ${a.settings.task.toLowerCase()}. Antes de afirmar utilidad como análogo de ${a.settings.target}, definir una región planetaria concreta, incorporar datos planetarios comparables a la misma escala, validar materiales y medir pendientes y obstáculos.\n`;
}
