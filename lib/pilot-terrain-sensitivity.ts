import pilot from "@/data/pilot-evidence.json";
import { terrainSensitivity } from "./terrain-sensitivity";

export const pilotTerrainSensitivity = {
  method: "nested-grid-1",
  scope: "Descriptivo. Reutiliza los nodos del piloto. No armoniza la resolución efectiva ni modifica el ranking.",
  scenarios: terrainSensitivity(pilot.terrain, pilot.side, pilot.spacingM),
};
