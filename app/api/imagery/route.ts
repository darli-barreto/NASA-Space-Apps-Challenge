// Same-origin, restricted NASA imagery gateway. Never accepts arbitrary upstream URLs.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const layer = p.get("layer");
  if (p.has("z")) {
    const [z, row, col] = [p.get("z"), p.get("row"), p.get("col")].map((v) =>
      v === null ? NaN : Number(v),
    );
    const max = layer === "BlueMarble_ShadedRelief_Bathymetry" ? 7 : 8;
    if (
      ![
        "BlueMarble_ShadedRelief_Bathymetry",
        "MODIS_Terra_CorrectedReflectance_TrueColor",
      ].includes(layer ?? "") ||
      ![z, row, col].every(Number.isInteger) ||
      z < 0 ||
      z > max ||
      row < 0 ||
      col < 0 ||
      row >= Math.ceil(180 / (288 / 2 ** z)) ||
      col >= Math.ceil(360 / (288 / 2 ** z))
    )
      return Response.json({ error: "Tesela inválida." }, { status: 400 });
    const path =
      layer === "BlueMarble_ShadedRelief_Bathymetry"
        ? "default/500m"
        : "default/2025-07-01/250m";
    try {
      const r = await fetch(
        `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer}/${path}/${z}/${row}/${col}.jpeg`,
        { signal: AbortSignal.timeout(18000), next: { revalidate: 86400 } },
      );
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (
        !r.ok ||
        !r.headers.get("content-type")?.includes("image/jpeg") ||
        bytes[0] !== 255 ||
        bytes[1] !== 216
      )
        throw new Error("Tesela inválida");
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
          "X-Imagery-Provider": "NASA EOSDIS GIBS",
        },
      });
    } catch {
      return Response.json(
        { error: "Tesela NASA GIBS no disponible." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const bbox = (p.get("bbox") ?? "").split(",").map(Number);
  if (
    ![
      "BlueMarble_ShadedRelief_Bathymetry",
      "MODIS_Terra_CorrectedReflectance_TrueColor",
    ].includes(layer ?? "") ||
    bbox.length !== 4 ||
    bbox.some((n) => !Number.isFinite(n)) ||
    bbox[0] < -180 ||
    bbox[2] > 180 ||
    bbox[1] < -90 ||
    bbox[3] > 90 ||
    bbox[0] >= bbox[2] ||
    bbox[1] >= bbox[3]
  )
    return Response.json(
      { error: "Capa o extensión no válida." },
      { status: 400 },
    );
  const upstream = new URL(
    "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
  );
  upstream.search = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetMap",
    LAYERS: layer!,
    STYLES: "",
    SRS: "EPSG:4326",
    BBOX: bbox.join(","),
    WIDTH: "800",
    HEIGHT: "485",
    FORMAT: "image/jpeg",
    ...(layer!.startsWith("MODIS") ? { TIME: "2025-07-01" } : {}),
  }).toString();
  try {
    const r = await fetch(upstream, {
      signal: AbortSignal.timeout(18000),
      next: { revalidate: 86400 },
    });
    if (!r.ok) throw new Error(`GIBS HTTP ${r.status}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    // WMS can return an XML ServiceException with HTTP 200: it is not an image.
    if (
      !r.headers.get("content-type")?.includes("image/jpeg") ||
      bytes[0] !== 255 ||
      bytes[1] !== 216
    )
      throw new Error("GIBS no devolvió una imagen JPEG válida.");
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Imagery-Provider": "NASA EOSDIS GIBS",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "NASA GIBS no disponible o tiempo de espera agotado. Reintenta la carga.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
