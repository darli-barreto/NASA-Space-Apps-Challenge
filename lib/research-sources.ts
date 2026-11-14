const challengeUrl = "https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/";
export const challengeResourcesUrl = `${challengeUrl}?tab=resources`;

export type ResearchSource = { name: string; use: string; detail: string; href: string };

export const nasaSources: ResearchSource[] = [
  { name: "NASA/NGA · SRTM90m", use: "Ranking e inspección", detail: "Muestras de elevación terrestre para calcular relieve y gradiente. La app accede vía Open Topo Data.", href: "https://www.opentopodata.org/datasets/srtm/" },
  { name: "NASA PDS · LRO/LOLA", use: "Ranking lunar", detail: "Modelo LDEM_64 para Mons Mouton y Hadley. Sus nueve muestras definen los valores lunares de referencia.", href: "https://pds-geosciences.wustl.edu/missions/lro/lola.htm" },
  { name: "NASA PDS · MGS/MOLA", use: "Ranking marciano", detail: "Elevaciones del modelo MEGDR en la región de InSight. Sus nueve muestras definen los valores marcianos de referencia.", href: "https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" },
  { name: "NASA POWER", use: "Inspección terrestre", detail: "Climatología regional de temperatura del aire, precipitación y viento.", href: "https://power.larc.nasa.gov/docs/services/api/temporal/climatology/" },
  { name: "NASA Worldview / GIBS", use: "Mapas", detail: "Blue Marble para el mapa de Perú y MODIS Terra para visualización terrestre.", href: "https://worldview.earthdata.nasa.gov/" },
  { name: "LRO/LROC · WAC y NAC", use: "Imágenes lunares", detail: "Mosaico WAC en comparaciones visuales y recorte NAC de Mons Mouton en la ficha de Andagua.", href: "https://pds-geosciences.wustl.edu/missions/lro/" },
  { name: "MRO/CTX", use: "Imágenes marcianas", detail: "Mosaico de contexto en la comparación con InSight, servido mediante ArcGIS.", href: "https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer" },
  { name: "MODIS Terra · MOD11A2.061", use: "Evidencia piloto", detail: "Temperatura de superficie terrestre diurna y nocturna en Andagua.", href: "https://doi.org/10.5067/MODIS/MOD11A2.061" },
  { name: "LRO/Diviner", use: "Evidencia piloto", detail: "Temperatura de brillo superficial en Mons Mouton para el contraste térmico descriptivo.", href: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm" },
  { name: "LRO/LEND", use: "Evidencia piloto", detail: "Conteos de neutrones cerca de Mons Mouton. Se usan como evidencia complementaria de recursos.", href: "https://pds-geosciences.wustl.edu/lro/lro-l-lend-2-edr-v1/lrolen_0xxx/data/2011/20111211/lend_rdr_alds_20111211.xml" },
  { name: "LRO/Mini-RF", use: "Evidencia piloto", detail: "Razón de polarización circular del radar en la ventana lunar.", href: "https://pds-geosciences.wustl.edu/lro/lro-l-mrflro-5-global-mosaic-v1/lromrf_1001/data/128ppd/global_cpr_128ppd_simp_0c.lbl" },
  { name: "NASA Analog Explorer", use: "Control de comparación", detail: "Documenta la pareja Kīlauea–Hadley, evaluada como control fuera del ranking peruano.", href: "https://science.nasa.gov/solar-system/analog-explorer/" },
  { name: "NASA Solar System Treks", use: "Visores externos", detail: "Desde la comparación se puede abrir Moon Trek o Mars Trek con la referencia elegida.", href: "https://trek.nasa.gov/" },
];

export const partnerSources: ResearchSource[] = [
  { name: "INGEMMET · Geomorfología y geología", use: "Catálogo y evidencia piloto", detail: "Polígonos de unidades lávicas del Perú y cartografía geológica de Andagua.", href: "https://geocatminnube.ingemmet.gob.pe/arcgis/rest/services/SERV_GEOMORFOLOGIA/MapServer/0" },
  { name: "Copernicus DEM · GLO-30", use: "Evidencia piloto", detail: "Modelo de superficie terrestre para contrastar escalas de muestreo.", href: "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S16_00_W073_00_DEM/Copernicus_DSM_COG_10_S16_00_W073_00_DEM.tif" },
  { name: "JAXA · AW3D30", use: "Evidencia piloto", detail: "Modelo de superficie terrestre independiente, con máscara de calidad.", href: "https://www.eorc.jaxa.jp/ALOS/en/aw3d30/index.htm" },
  { name: "Copernicus Sentinel-2 L2A", use: "Evidencia piloto", detail: "Imagen en color y clasificación de superficie para los nodos de Andagua.", href: "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2A_18LYH_20260729_0_L2A" },
  { name: "Kaguya SP / LRO LOLA", use: "Evidencia piloto", detail: "Estimación mineralógica y cobertura espectral en Mons Mouton.", href: "https://zenodo.org/records/7108163" },
  { name: "Petrografía de Huajana", use: "Evidencia piloto", detail: "Estudio de una muestra regional del campo volcánico de Andagua.", href: "https://doi.org/10.1007/s00710-021-00744-0" },
  { name: "Estudio geológico de Mons Mouton", use: "Evidencia piloto", detail: "Cartografía e interpretación geológica de la referencia lunar.", href: "https://doi.org/10.1029/2025JE009127" },
  { name: "CSA · RADARSAT-1", use: "Evidencia piloto", detail: "Recorte radar de Andagua del archivo canadiense EODMS.", href: "https://www.eodms-sgdot.nrcan-rncan.gc.ca/search/collections/Radarsat-1-L1-COG/items/b5017f66-b39a-5d89-9f5f-cbbeb0050106" },
  { name: "USGS · Meteor Crater", use: "Control de comparación", detail: "Referencia documental para el entorno de Meteor Crater.", href: "https://pubs.usgs.gov/circ/1300/pdf/Cir1300_508.pdf" },
  { name: "BLM · Salina de Bonneville", use: "Control de comparación", detail: "Referencia documental para el control de la salina de Bonneville.", href: "https://www.blm.gov/visit/bonneville-salt-flats" },
  { name: "IAU/USGS · Mons Mouton", use: "Referencia geográfica", detail: "Centro oficial de la formación usado para ubicar la ventana lunar.", href: "https://planetarynames.wr.usgs.gov/Feature/16070" },
  { name: "Natural Earth", use: "Mapa", detail: "Contorno del Perú para la vista de búsqueda.", href: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/" },
  { name: "Esri World Imagery", use: "Mapa y portadas", detail: "Imágenes satelitales del entorno de los candidatos.", href: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" },
];

export const challengeResources: ResearchSource[] = [
  { name: "NASA Earthdata Search", use: "Portal", detail: "Búsqueda de productos terrestres y metadatos.", href: "https://search.earthdata.nasa.gov/" },
  { name: "NASA Worldview", use: "Usado", detail: "Visualización de las capas NASA que la app consume vía GIBS.", href: "https://worldview.earthdata.nasa.gov/" },
  { name: "NASA Planetary Data System", use: "Usado", detail: "Archivo de los productos LOLA y MOLA del ranking y de evidencia lunar del piloto.", href: "https://pds.nasa.gov/" },
  { name: "NASA Lunar Reconnaissance Orbiter", use: "Usado", detail: "Misión de LOLA, LROC, Diviner, LEND y Mini-RF.", href: "https://pds-geosciences.wustl.edu/missions/lro/" },
  { name: "NASA LRO Diviner Lunar Data", use: "Usado", detail: "Fuente del contraste térmico lunar de Andagua–Mons Mouton.", href: "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm" },
  { name: "CSA · RADARSAT Constellation", use: "Consulta de catálogo", detail: "Se consultó disponibilidad de escenas para Andagua.", href: "https://donnees-data.asc-csa.gc.ca/en/dataset/rcm" },
  { name: "CSA · RADARSAT-1", use: "Usado", detail: "Archivo que documenta la escena radar del piloto.", href: "https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1" },
  { name: "CSA · Tutorial SAR", use: "Formación", detail: "Procesamiento y visualización de radar con Python y QGIS.", href: "https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial" },
  { name: "Copernicus Data Space Ecosystem", use: "Portal", detail: "Acceso a Sentinel. La escena usada se obtuvo vía Earth Search.", href: "https://dataspace.copernicus.eu/" },
  { name: "ESA Open Science Catalogue", use: "Portal", detail: "Búsqueda de productos, estudios y flujos de trabajo.", href: "https://opensciencedata.esa.int/" },
  { name: "JAXA G-Portal", use: "Portal", detail: "Búsqueda de observaciones de JAXA. AW3D30 se obtuvo del archivo EORC.", href: "https://gportal.jaxa.jp/gpr/index/index" },
];

export const researchSources = [...nasaSources, ...partnerSources, ...challengeResources];
