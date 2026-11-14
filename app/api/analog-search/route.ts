import { analyzeDetailedTerrain } from "@/lib/detailed-terrain.server";
import { srtm, type SrtmResponse } from "@/lib/srtm.server";
import { archivedAnalogCatalog, getAnalogCatalog } from "@/lib/analog-catalog.server";
import { archivedElevations, rawSampleMatches } from "@/lib/analog-archive";
import { planetaryProfile } from "@/lib/planetary";
import { signature, terrainDistance } from "@/lib/analog-math";
import type { Contrast } from "@/lib/analog-search";

export async function GET() {
  try { return Response.json(await getAnalogCatalog()); }
  catch (e) { return Response.json({ error: e instanceof Error ? e.message : "No se pudo obtener el catálogo." }, { status: 502 }); }
}

export async function POST(request: Request) {
  let body: { profile?: unknown; ids?: unknown; archivedCatalog?: unknown; detail?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  const profile = typeof body?.profile === "string" ? planetaryProfile(body.profile) : undefined;
  const ids = body?.ids;
  if (!profile || !Array.isArray(ids) || ids.length < 1 || ids.length > 8 || ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) return Response.json({ error: "Perfil o lote inválido (1–8 identificadores únicos)." }, { status: 400 });
  if (body.detail !== undefined && (body.detail !== true || ids.length !== 1)) return Response.json({ error: "El detalle requiere un único candidato." }, { status: 400 });
  try {
    const catalog = body.archivedCatalog === true ? archivedAnalogCatalog : await getAnalogCatalog();
    const selected = ids.map(id => catalog.candidates.find(c => c.id === id));
    if (selected.some(c => !c || c.gridInside !== 9)) return Response.json({ error: "Solo se comparan candidatos oficiales con 9 muestras dentro de la unidad cartografiada." }, { status: 400 });
    const candidates = selected.filter(c => c !== undefined);
    if (body.detail === true) return Response.json(await analyzeDetailedTerrain(candidates[0], profile, { preferArchive: catalog.archived === true }));
    const samples = candidates.flatMap(c => c.samples);
    const source = `https://api.opentopodata.org/v1/srtm90m?${new URLSearchParams({ locations: samples.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join("|"), interpolation: "bilinear", nodata_value: "null" })}`;
    let saved = catalog.archived ? archivedElevations(candidates) : undefined;
    let raw: SrtmResponse;
    if (saved) {
      raw = { status: "OK", results: saved.flatMap(observation => observation.rows) };
    } else {
      try {
        const live = await srtm(source);
        if (live.results.length !== samples.length || !samples.every((p, i) => rawSampleMatches(p, live.results[i]))) {
          throw new Error("Muestras SRTM incompatibles.");
        }
        raw = live;
      } catch {
        saved = archivedElevations(candidates);
        if (!saved) return Response.json({ error: "Elevaciones SRTM no disponibles. Reintenta la búsqueda." }, { status: 502 });
        raw = { status: "OK", results: saved.flatMap(observation => observation.rows) };
      }
    }
    const archived = !!saved;
    const points = samples.map((p, i) => {
      const elevation = raw.results[i].elevation;
      return { ...p, elevation: typeof elevation === "number" && Number.isFinite(elevation) && elevation >= -500 && elevation <= 9000 ? elevation : null };
    });
    const retrievedAt = new Date().toISOString();
    const results: Contrast[] = candidates.map((c, i) => {
      const samples = points.slice(i * 9, i * 9 + 9), sig = signature(samples);
      const observation = saved?.[i];
      return { id: c.id, samples, signature: sig, distance: terrainDistance(sig, profile.signature), reason: sig ? null : "SRTM incompleto: no se asigna distancia ni puesto.", source: observation?.source ?? source, retrievedAt: observation?.retrievedAt ?? retrievedAt, archived };
    });
    return Response.json({ profile: profile.id, results, raw, source: archived ? null : source, retrievedAt: archived ? null : retrievedAt, cacheHours: 24, archived });
  } catch { return Response.json({ error: "No se pudo completar el contraste. Reintenta la búsqueda." }, { status: 502 }); }
}
