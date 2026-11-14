import { archivedAnalogCatalog, getAnalogCatalog } from "@/lib/analog-catalog.server";
import { archivedThermal, fetchModisThermal, thermalResult } from "@/lib/catalog-thermal";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const value = params.get("id");
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    return Response.json({ status: "invalid" }, { status: 400 });
  }
  const id = Number(value);
  try {
    const catalog = params.get("archived") === "1" ? archivedAnalogCatalog : await getAnalogCatalog();
    const site = catalog.candidates.find(row => row.id === id && row.gridInside === 9);
    if (!site) return Response.json({ status: "unknown" }, { status: 404 });
    const saved = archivedThermal(site);
    const modis = saved ? thermalResult(saved.source, saved.cellM, saved.rows, saved.retrievedAt) :
      await fetchModisThermal(site.lat, site.lon).catch(() => null);
    return Response.json({ status: modis ? "available" : "unavailable", site: { id, lat: site.lat, lon: site.lon }, modis });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 502 });
  }
}
