import catalogAreaTerrain from "@/data/catalog-area-terrain.json";
import areaTerrain from "@/data/pilot-area-terrain.json";
import areaTerrainNative from "@/data/pilot-area-terrain-native.json";
import { planetaryProfiles } from "@/lib/planetary";
import { challengeResourcesUrl, nasaSources, partnerSources, challengeResources } from "@/lib/research-sources";
import catalog from "@/data/catalog-validation.json";
import detailedTerrain from "@/data/detailed-terrain.json";
import srtm from "@/data/contrast-validation.json";
import controls from "@/data/terrain-controls.json";
import pilot from "@/data/pilot-evidence.json";
import terrain from "@/data/pilot-terrain-aggregated.json";
import geology from "@/data/pilot-geology.json";
import earthMaterials from "@/data/pilot-earth-materials.json";
import lunarMineralogy from "@/data/pilot-lunar-mineralogy.json";
import radar from "@/data/pilot-radar.json";
import neutrons from "@/data/pilot-lend.json";
import thermal from "@/data/pilot-thermal.json";
import peruBoundary from "@/data/peru-boundary.json";
import ingemmet from "@/data/ingemmet-validation.json";
import { mobilityProfile } from "@/lib/mobility-assessment";
import { algorithmVersion, terrainDistanceBreakdown } from "@/lib/analog-math";
import { terrainMetrics } from "@/lib/terrain-metrics";
import { terrainControlReport } from "@/lib/terrain-control-report";
import { pilotTerrainSensitivity } from "@/lib/pilot-terrain-sensitivity";
import { earthThermal, lunarThermal } from "@/lib/pilot-thermal";

export function GET() {
  return Response.json({
    description: "Referencias y extracciones archivadas. Los resultados de consultas en vivo se exportan desde la app. Las imágenes en los servicios originales se indican mediante enlaces.",
    sources: { nasa: nasaSources, other: partnerSources, challenge: challengeResources, challengeResourcesUrl },
    planetaryProfiles,
    archives: { catalogAreaTerrain, catalog, ingemmet, srtm, controls, peruBoundary, detailedTerrain },
    pilot: { ...pilot, areaTerrain, areaTerrainNative, terrainAggregated: terrain, terrainSensitivity: pilotTerrainSensitivity, geology, earthMaterials, lunarMineralogy, radar, neutrons, thermal },
    analysis: {
      algorithmVersion,
      rankingWeights: terrainDistanceBreakdown(planetaryProfiles[0].signature, planetaryProfiles[0].signature)?.metrics.map(({ id, weight }) => ({ id, weight })),
      mobilityProfile,
      terrainControlReport,
      pilotTerrain: pilot.terrain.map(product => ({ id: product.id, metrics: terrainMetrics(product.values, pilot.side, pilot.spacingM) })),
      pilotAggregated: terrain.terrain.map(product => ({ id: product.id, metrics: terrainMetrics(product.values, terrain.side, terrain.spacingM) })),
      pilotThermal: { earth: earthThermal, moon: lunarThermal.map(({ product, statistics }) => ({ product, statistics })) },
    },
  }, { headers: { "Content-Disposition": 'attachment; filename="terra-datos-referencia.json"' } });
}
