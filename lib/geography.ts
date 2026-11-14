export type Point = { lat: number; lon: number };
export function gibsTiles(west: number, south: number, width: number, height: number, maxZoom = 7) {
  const z = Math.max(0, Math.min(maxZoom, Math.ceil(Math.log2(288 / width * 2))));
  const span = 288 / 2 ** z;
  const tiles = [];
  for (let row = Math.max(0, Math.floor((90 - south - height) / span)); row <= Math.floor((90 - south - 1e-9) / span); row++) {
    for (let col = Math.max(0, Math.floor((west + 180) / span)); col <= Math.floor((west + width + 180 - 1e-9) / span); col++) {
      tiles.push({ z, row, col, x: (-180 + col * span - west) / width * 1000, y: (south + height - (90 - row * span)) / height * 606, width: span / width * 1000, height: span / height * 606 });
    }
  }
  return tiles;
}
export function distanceKm(a: Point, b: Point) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function pointInView(x: number, y: number, west: number, south: number, width: number, height: number): Point {
  return { lon: west + Math.max(0, Math.min(1, x)) * width, lat: south + height - Math.max(0, Math.min(1, y)) * height };
}
