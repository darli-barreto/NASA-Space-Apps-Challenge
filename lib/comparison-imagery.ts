import type { GeoPoint } from "./analog-math";

export const worldImagery = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

export function satelliteUrl(lat: number, lon: number, width: number, size = 768) {
  const radians = lat * Math.PI / 180;
  const x = 6378137 * lon * Math.PI / 180;
  const y = 6378137 * Math.asinh(Math.tan(radians));
  const half = width / (2 * Math.cos(radians));
  const query = new URLSearchParams({
    bbox: [x - half, y - half, x + half, y + half].map(Math.round).join(","),
    bboxSR: "3857", imageSR: "3857", size: `${size},${size}`, format: "jpg", f: "image",
  });
  return `${worldImagery}/export?${query}`;
}

export const comparisonImageSources = {
  earth: { label: "NASA GIBS · MODIS Terra", credit: "Color natural · 250 m · 1 jul 2025", url: "https://worldview.earthdata.nasa.gov/" },
  moon: { label: "LROC WAC · NASA Trek", credit: "NASA/GSFC/ASU · mosaico WAC", url: "https://trek.nasa.gov/moon/" },
  mars: { label: "MRO CTX · NASA Trek", credit: "NASA/JPL/MSSS/Murray Lab · mosaico sin control geodésico", url: "https://trek.nasa.gov/mars/" },
} as const;
export type ImageBody = keyof typeof comparisonImageSources;

const trekViews = {
  moon: { label: "Ver en Moon Trek", projection: "104903", zoom: 9 },
  mars: { label: "Ver en Mars Trek", projection: "104905", zoom: 10 },
} as const;

export function planetaryViewer(body: keyof typeof trekViews, center: GeoPoint, radiusKm: number, spacingKm: number) {
  const { label, projection, zoom } = trekViews[body];
  const { west, south, east, north } = comparisonFrame(center, radiusKm, spacingKm);
  const state = new URLSearchParams({
    v: "0.1", x: String(center.lon), y: String(center.lat), z: String(zoom),
    p: `urn:ogc:def:crs:EPSG::${projection}`, b: body, e: [west, south, east, north].join(","),
  });
  return { label, href: `${comparisonImageSources[body].url}#${state}` };
}

export function comparisonFrame(center: GeoPoint, radiusKm: number, spacingKm: number) {
  const halfSpanKm = spacingKm * 1.65;
  const deltaLat = halfSpanKm / radiusKm * 180 / Math.PI;
  const deltaLon = deltaLat / Math.cos(center.lat * Math.PI / 180);
  const west = center.lon - deltaLon, east = center.lon + deltaLon;
  const south = center.lat - deltaLat, north = center.lat + deltaLat;
  const project = (point: GeoPoint) => {
    const delta = ((point.lon - center.lon + 540) % 360) - 180;
    return { x: 50 + delta / (2 * deltaLon) * 100, y: (north - point.lat) / (2 * deltaLat) * 100 };
  };
  return { west, south, east, north, project };
}

export function comparisonImageTiles(body: ImageBody, frame: ReturnType<typeof comparisonFrame>) {
  const { west, south, east, north } = frame;
  if (body === "earth") {
    const query = new URLSearchParams({
      layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
      bbox: [west, south, east, north].map(value => value.toFixed(6)).join(","),
    });
    return [{ src: `/api/imagery?${query}`, x: 0, y: 0, width: 100, height: 100 }];
  }
  // NASA Trek's equirectangular WMTS grids start at (-180°, 90°).
  const z = body === "moon" ? 8 : 10;
  const span = 180 / 2 ** z;
  const tiles = [];
  for (let row = Math.floor((90 - north) / span); row < Math.ceil((90 - south) / span); row++) {
    for (let col = Math.floor((west + 180) / span); col < Math.ceil((east + 180) / span); col++) {
      const columns = 2 ** (z + 1);
      const tileCol = (col + columns) % columns;
      const src = body === "moon"
        ? `https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/${z}/${row}/${tileCol}.jpg`
        : `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/${z}/${row}/${tileCol}`;
      tiles.push({ src, x: (-180 + col * span - west) / (east - west) * 100, y: (north - 90 + row * span) / (north - south) * 100,
        width: span / (east - west) * 100, height: span / (north - south) * 100 });
    }
  }
  return tiles;
}
