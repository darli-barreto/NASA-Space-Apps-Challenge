import { terrainMetrics } from "./terrain-metrics";

export const mobilityProfile = {
  id: "robotic-mobility-v1",
  dimensions: [
    { id: "materials", label: "Geología, mineralogía y materiales", weight: 15, pending: "Falta verificar la composición en ambos sitios a escala comparable." },
    { id: "terrain", label: "Terreno, pendientes, rugosidad y cráteres", weight: 45, pending: "Falta un inventario comparable de cráteres y obstáculos." },
    { id: "environment", label: "Temperatura, iluminación y extremos", weight: 10, pending: "Faltan series de superficie e iluminación comparables." },
    { id: "resources", label: "Agua, hielo, permafrost y recursos", weight: 0, pending: "Faltan mediciones directas de recursos." },
    { id: "dust", label: "Polvo, viento, erosión y atmósfera", weight: 5, pending: "Faltan mediciones comparables de polvo y erosión." },
    { id: "biology", label: "Biología, extremófilos, habitabilidad y biofirmas", weight: 0, pending: "Falta evidencia específica sobre habitabilidad y biofirmas." },
    { id: "subsurface", label: "Cuevas, tubos de lava y subsuelo", weight: 0, pending: "Faltan inventarios y observaciones del subsuelo." },
    { id: "operations", label: "Aterrizaje, movilidad, navegación, robótica, operación humana y construcción", weight: 25, pending: "Faltan rutas, obstáculos y ensayos robotizados o humanos. La construcción requiere ensayos del suelo." },
  ],
  terrainVariables: [
    { id: "relief", label: "Relieve", unit: "m", weight: 40, floor: 10 },
    { id: "highGradient", label: "Gradiente P90", unit: "°", weight: 25, floor: 0.1 },
    { id: "medianGradient", label: "Gradiente mediano", unit: "°", weight: 15, floor: 0.1 },
    { id: "localDeviation", label: "Desviación frente a vecinos", unit: "m", weight: 20, floor: 10 },
  ],
  terrainSensitivity: [
    { id: "relief-priority", weights: { relief: 55, highGradient: 20, medianGradient: 10, localDeviation: 15 } },
    { id: "gradient-priority", weights: { relief: 25, highGradient: 35, medianGradient: 20, localDeviation: 20 } },
  ],
} as const;

type TerrainMetrics = ReturnType<typeof terrainMetrics>;

export function assessMobility(earth: TerrainMetrics, reference: TerrainMetrics) {
  const variables = earth && reference ? mobilityProfile.terrainVariables.map(variable => {
    const a = earth[variable.id], b = reference[variable.id];
    const distance = Math.abs(a - b) / (a + b + variable.floor);
    return { ...variable, earth: a, reference: b, distance, contribution: distance * variable.weight / 100 };
  }) : [];
  const terrainDistance = variables.length
    ? variables.reduce((sum, v) => sum + v.contribution, 0)
    : null;
  const dimensions = mobilityProfile.dimensions.map(dimension => ({
    ...dimension,
    distance: dimension.id === "terrain" ? terrainDistance : null,
  }));
  const evaluated = dimensions.filter(row => row.distance !== null && row.weight > 0);
  const coverage = evaluated.reduce((sum, row) => sum + row.weight, 0);
  const weightedDistance = evaluated.reduce((sum, row) => sum + row.weight * (row.distance ?? 0), 0);
  return {
    dimensions, variables, coverage,
    sensitivity: variables.length ? mobilityProfile.terrainSensitivity.map(scenario => ({
      id: scenario.id,
      distance: variables.reduce((sum, v) => sum + v.distance * scenario.weights[v.id] / 100, 0),
    })) : [],
    partialDistance: coverage > 0 ? weightedDistance / coverage : null,
    globalDistanceBounds: [weightedDistance / 100, (weightedDistance + 100 - coverage) / 100],
  };
}
