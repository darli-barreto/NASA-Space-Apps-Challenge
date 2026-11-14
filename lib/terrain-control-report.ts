import observations from "@/data/terrain-controls.json";
import hadley from "@/data/planetary/moon-hadley.json";
import monsMouton from "@/data/planetary/moon-mons-mouton.json";
import { algorithmVersion, signature, terrainDistance } from "./analog-math";

const weights = [.25, .5, .75];
const rows = observations.controls.map(control => {
  const metrics = signature(control.samples, observations.spacingKm);
  return { ...control, metrics };
});

const references = [hadley, monsMouton].map(profile => ({
  reference: {
    id: profile.id, name: profile.name, signature: profile.signature, source: profile.labelUrl,
  },
  rows: rows.map(row => ({
    ...row,
    distances: weights.map(weight => terrainDistance(row.metrics, profile.signature, weight)),
  })),
}));

export const terrainControlReport = {
  source: observations.source,
  retrievedAt: observations.retrievedAt,
  spacingKm: observations.spacingKm,
  algorithmVersion,
  weights,
  references,
  scope: "Prueba exploratoria con las mismas ventanas para Hadley y Mons Mouton. Kīlauea es un caso documentado de paisajes basálticos para Hadley. Para Mons Mouton las tres ventanas son controles de contraste, sin un positivo geológico validado. Fuera del ranking peruano.",
};
