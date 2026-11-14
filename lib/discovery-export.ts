import areaTerrain from "@/data/pilot-area-terrain.json";
import { detailedMethod } from "./detailed-terrain";
import pilot from "@/data/pilot-evidence.json";
import geology from "@/data/pilot-geology.json";
import earthMaterials from "@/data/pilot-earth-materials.json";
import lunarMineralogy from "@/data/pilot-lunar-mineralogy.json";
import aggregated from "@/data/pilot-terrain-aggregated.json";
import { terrainControlReport } from "@/lib/terrain-control-report";
import radar from "@/data/pilot-radar.json";
import { pilotTerrainSensitivity } from "@/lib/pilot-terrain-sensitivity";
import lend from "@/data/pilot-lend.json";
import { terrainMetrics } from "@/lib/terrain-metrics";
import { pilotThermal, earthThermal, lunarThermal } from "@/lib/pilot-thermal";
import { evidenceDimensions } from "@/lib/evidence-dimensions";
import { mobilityProfile } from "@/lib/mobility-assessment";
import { algorithmVersion, rankedContrasts } from "@/lib/analog-search";
import type { AnalogCatalog, Contrast } from "@/lib/analog-search";
import { polarReferenceId, scientificLimits } from "@/lib/planetary";
import { challengeResourcesUrl, researchSources } from "@/lib/research-sources";
import { verificationBounds, verificationGates } from "@/lib/verification";
import { assessProtocol, fieldProtocol } from "@/lib/field-protocol";


import type { PlanetaryProfile } from "./planetary";
import type { readProtocolRecords } from "./field-protocol";
export type Batch = {
  profile: string;
  results: Contrast[];
  raw: unknown;
  source: string | null;
  retrievedAt: string | null;
  archived?: boolean;
  cacheHours: number;
};
type ExportContext = {
  profileId: string; profile: PlanetaryProfile; catalog: AnalogCatalog | null;
  ranked: ReturnType<typeof rankedContrasts>; referenceTerrainMetrics: ReturnType<typeof terrainMetrics>;
  complete: boolean; results: Contrast[]; batches: Batch[]; records: ReturnType<typeof readProtocolRecords>;
};
export function downloadDiscovery({profileId, profile, catalog, ranked, referenceTerrainMetrics, complete, results, batches, records}: ExportContext) {
    const data = {
      algorithm: algorithmVersion,
      exportedAt: new Date().toISOString(),
      profile,
      method: {
        grid: "3×3; 2 km entre nodos; geometría esférica con radio de cada cuerpo",
        earthRadiusKm: 6371,
        geologyGate: ["Ca-la", "M-vl", "L-fl"],
        geologyInterpretation: profileId === polarReferenceId
          ? "Filtro del catálogo terrestre. El contraste con Mons Mouton mide topografía exclusivamente."
          : "Contexto geológico exploratorio; no demuestra equivalencia de materiales.",
        ranking:
          "d = 0.5 |R-Rref|/(R+Rref+10m) + 0.5 |G90-G90ref|/(G90+G90ref+0.1°)",
        sensitivityReliefWeights: [0.25, 0.5, 0.75],
        status: complete ? "complete" : "partial",
        noDataPolicy: "9/9 muestras finitas requeridas; no se imputan ausentes",
        novelty: "No evaluada; no afirmar descubrimiento nuevo",
      },
      catalog,
      ranked,
      refinement: { method: detailedMethod, candidates: ranked.slice(0, detailedMethod.shortlist).map(row => ({
        id: row.id, status: row.detailed?.profileId === profileId ? row.detailed.status : "not-completed",
        result: row.detailed?.profileId === profileId ? row.detailed : null,
      })) },
      referenceTerrainMetrics,
      mobilityProfile,
      evidenceDimensions,
      terrainControls: terrainControlReport,
      pilotEvidence: profileId === pilot.referenceId && ranked.some(row => row.id === pilot.candidateId)
        ? { ...pilot, areaTerrain, aggregatedTerrain: {
          ...aggregated,
          terrain: aggregated.terrain.map(product => ({
            ...product,
            metrics: terrainMetrics(product.values, aggregated.side, aggregated.spacingM),
          })),
        }, terrainSensitivity: pilotTerrainSensitivity, geology,
        mineralogy: { earth: earthMaterials, moon: lunarMineralogy, comparison: "descriptive", usedInRanking: false },
        radar, lend, thermal: {
          ...pilotThermal,
          summaries: { earth: earthThermal, moon: lunarThermal.map(({ product, statistics }) => ({ product, statistics })) },
          interpretation: "Contraste descriptivo. Distintos horarios, periodos y resoluciones. Fuera del ranking.",
        }, credits: [
          "Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.",
          "AW3D30 © JAXA",
          "Contains modified Copernicus Sentinel data (2026)",
          "LROC NAC: NASA/GSFC/Arizona State University/Intuitive Machines",
        ], terrain: pilot.terrain.map(product => ({
          ...product, metrics: terrainMetrics(product.values, pilot.side, pilot.spacingM),
        })) }
        : null,
      unranked: results.filter((r) => !r.signature),
      sourceBatches: batches,
      limits: scientificLimits,
      resourceCatalog: { challengeResourcesUrl, sources: researchSources },
    };
    const assessments = ranked.map(row => assessProtocol(records, profileId, row.id));
    const dossier = {
      ...data,
      verification: {
        version: "bounded-elevation-1",
        status: "preliminary-unvalidated",
        earthErrorM: 0,
        referenceErrorM: 0,
        assumption:
          "Cotas hipotéticas por muestra, no exactitud del producto ni intervalos de confianza. Pesos 0.25, 0.5 y 0.75. No evalúa cambios de escala o centro.",
        bounds: verificationBounds(results, profile.signature, 0, 0),
        gates: verificationGates,
        userEvidence: Object.fromEntries(assessments.flatMap(assessment =>
          assessment.criteria.flatMap((criterion, index) => criterion.evidence
            ? [[`${profileId}:${assessment.candidateId}:${index}`, criterion.evidence]]
            : []))),
        fieldProtocol: { ...fieldProtocol, assessments },
      },
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `terra-${profileId}-${complete ? "completo" : "parcial"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
