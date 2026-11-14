export const fieldProtocol = {
  version: "field-verification-1",
  scope: "Utilidad del sitio para un ensayo de reconocimiento y movilidad. Identifica el ensayo en la hipótesis del expediente de cada candidato y referencia.",
  criteria: [
    { id: "hypothesis", name: "Hipótesis y umbrales", acceptance: "Antes de medir, fija la tarea, el equipo, las rutas, las repeticiones y los umbrales con unidades. Indica qué resultado refutaría la hipótesis." },
    { id: "terrain", name: "Terreno a escala comparable", acceptance: "Documenta resolución, cobertura y datum de cada DEM. Comprueba el resultado con escalas y centros alternativos y conserva los cambios de orden." },
    { id: "materials", name: "Geología y materiales", acceptance: "Contrasta fuentes independientes. Si afirmas equivalencia de materiales, aporta mediciones locales representativas y un método comparable, con incertidumbre. Para una hipótesis de movilidad, delimita y documenta las diferencias." },
    { id: "controls", name: "Controles", acceptance: "Evalúa controles positivos y negativos independientes con el mismo método, sin reajustar los umbrales tras ver los resultados." },
    { id: "novelty", name: "Bibliografía y novedad", acceptance: "Registra las consultas, su fecha y los sitios publicados. Delimita qué aporta el candidato respecto de los análogos documentados." },
    { id: "ground-truth", name: "Mediciones de campo", acceptance: "Levanta rutas y puntos georreferenciados con fotos, pendiente, obstáculos y tipo de superficie. Entrega mediciones, resolución e incertidumbre. Identifica las estaciones y muestras del ensayo cuando correspondan." },
    { id: "mobility", name: "Ensayo y revisión", acceptance: "Mide finalización de ruta, distancia, tiempo e incidencias. Si el ensayo es con rover, registra también deslizamiento y contactos con obstáculos. Aplica los umbrales registrados y adjunta una revisión independiente." },
  ],
  fieldSteps: [
    "Antes. Define rutas comparables en el candidato y los controles, selecciona estaciones y confirma acceso y permisos.",
    "En campo. Usa el mismo equipo y procedimiento. Guarda trazas, fotos con escala, mediciones y cualquier cambio de ruta.",
    "Después. Publica datos y método, contrasta los umbrales y documenta incertidumbre, resultados adversos y revisión independiente.",
  ],
  sources: [
    { label: "NASA · D-RATS 2022", url: "https://ntrs.nasa.gov/citations/20230017073" },
    { label: "NASA · Ensayos de movilidad", url: "https://ntrs.nasa.gov/citations/20250003470" },
  ],
} as const;

const outcomes = ["pending", "met", "not-met", "inconclusive"] as const;
type CriterionOutcome = typeof outcomes[number];
type CriterionReview = { outcome: CriterionOutcome; evidence: string; source: string; author: string; updatedAt: string };
type ProtocolRecords = Record<string, CriterionReview>;
type CriterionId = typeof fieldProtocol.criteria[number]["id"];

const emptyReview: CriterionReview = { outcome: "pending", evidence: "", source: "", author: "", updatedAt: "" };
export const reviewKey = (referenceId: string, candidateId: number, criterion: CriterionId) =>
  `${referenceId}:${candidateId}:${criterion}`;

export function readProtocolRecords(raw: string): ProtocolRecords {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) =>
      value && outcomes.includes(value.outcome) &&
      [value.evidence, value.source, value.author, value.updatedAt].every(field => typeof field === "string")));
  } catch {
    return {};
  }
}

export function assessProtocol(records: ProtocolRecords, referenceId: string, candidateId: number) {
  const criteria = fieldProtocol.criteria.map(criterion => {
    const review = records[reviewKey(referenceId, candidateId, criterion.id)] ?? emptyReview;
    const documented = review.outcome !== "pending" &&
      [review.evidence, review.source, review.author].every(field => field.trim());
    return { ...criterion, ...review, documented };
  });
  const documented = criteria.filter(criterion => criterion.documented).length;
  const status = criteria.some(c => c.documented && c.outcome === "not-met") ? "criterion-not-met"
    : criteria.some(c => c.documented && c.outcome === "inconclusive") ? "inconclusive"
    : documented === criteria.length ? "ready-for-review" : "pending";
  return { candidateId, referenceId, documented, status, criteria } as const;
}
