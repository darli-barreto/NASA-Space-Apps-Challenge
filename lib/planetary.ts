import moon from "@/data/planetary/moon-hadley.json";
import mars from "@/data/planetary/mars-insight.json";
import monsMouton from "@/data/planetary/moon-mons-mouton.json";

export const planetaryProfiles = [monsMouton, moon, mars];
export const defaultPlanetaryProfile = monsMouton.id;
export const polarReferenceId = monsMouton.id;
export type PlanetaryProfile = typeof moon;
export function planetaryProfile(id: string) { return planetaryProfiles.find(p => p.id === id); }
export const scientificLimits = [
  "Cribado de terrenos volcánicos en la cobertura de INGEMMET (Perú); no es una búsqueda mundial ni cubre todos los tipos de análogo.",
  "9 muestras separadas 2 km: ventana aproximada de 4 × 4 km. Gradientes entre muestras, no pendientes locales, obstáculos ni seguridad para aterrizar.",
  "SRTM ≈90 m, LOLA ≈474 m y MOLA ≈463 m en latitud. Igual separación física, distinta resolución nativa: el ranking es preliminar y puede cambiar al armonizar los DEM. La interpolación no añade detalle real.",
  "SRTM incluye efectos de vegetación/estructuras; los productos planetarios pueden interpolar huecos. No se comparan altitudes absolutas sobre datums distintos.",
  "Origen volcánico compartido no demuestra equivalencia mineralógica. Basalto-andesita terrestre, basalto lunar y regolito sobre lava marciana requieren estudios distintos.",
  "No se han medido aquí temperatura superficial/iluminación, hielo/recursos, polvo, biología ni cuevas. No inferirlos de aridez, color o topografía.",
  "La Tierra no reproduce gravedad, vacío lunar, atmósfera marciana ni radiación. La utilidad operativa, acceso, permisos y novedad siguen pendientes de validación.",
  "Mons Mouton: centro de la formación según IAU/USGS y ventana de estudio de TERRA. NASA incluyó la región en su selección de 2024. La ventana no define un punto de alunizaje ni una base aprobada.",
  "Hadley e InSight son referencias históricas. En Mons Mouton el filtro volcánico solo acota el catálogo peruano: la clasificación no implica un proceso compartido con la Luna.",
];
