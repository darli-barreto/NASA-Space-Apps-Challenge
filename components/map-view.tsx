"use client";
import { useSourceText } from "./source-text";
import { useTranslations } from "next-intl";

import { Message } from "@/components/message";

import { useEffect, useMemo, useRef, useState } from "react";
import { Analysis, Site, candidates } from "@/lib/analysis";
import { distanceKm, pointInView, gibsTiles, Point } from "@/lib/geography";

export default function MapView({ site, setSite, result }: { site: Site; setSite: (s: Site) => void; result: Analysis | null }) {
  const sourceText = useSourceText();
  const translate = useTranslations();
  const [span, setSpan] = useState(Math.max(.08, site.radius / 111.32 * 4));
  const center = { lat: site.lat, lon: site.lon };
  const [layer, setLayer] = useState("BlueMarble_ShadedRelief_Bathymetry");
  const [mode, setMode] = useState<"point" | "circle">("point");
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [imagery, setImagery] = useState<{ key: string; status: "loading" | "ready" | "error"; tiles?: {src: string; x: number; y: number; width: number; height: number}[] }>({ key: "", status: "loading" });
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => { }, [site.lat, site.lon]);
  const width = span * 1.65, height = span;
  const west = Math.max(-180, Math.min(180 - width, center.lon - width / 2));
  const south = Math.max(-90, Math.min(90 - height, center.lat - height / 2));
  const tiles = useMemo(() => gibsTiles(west, south, width, height, layer.startsWith("MODIS") ? 8 : 7), [west, south, width, height, layer]);
  const key = JSON.stringify({ tiles, layer, attempt });
  useEffect(() => {
    const control = new AbortController(); const urls: string[] = [];
    (async () => {
      const results = await Promise.allSettled(tiles.map(async tile => {
        const query = new URLSearchParams({ layer, z: String(tile.z), row: String(tile.row), col: String(tile.col), attempt: String(attempt) });
        const response = await fetch(`/api/imagery?${query}`, { signal: AbortSignal.any([control.signal, AbortSignal.timeout(23000)]) });
        if (!response.ok || !response.headers.get("content-type")?.includes("image/jpeg")) throw new Error("Tesela no disponible");
        const src = URL.createObjectURL(await response.blob());
        if (control.signal.aborted) { URL.revokeObjectURL(src); throw new Error("Cancelado"); }
        urls.push(src); return { ...tile, src };
      }));
      if (!control.signal.aborted) setImagery({ key, status: results.every(r => r.status === "fulfilled") ? "ready" : "error", tiles: results.flatMap(r => r.status === "fulfilled" ? [r.value] : []) });
    })();
    return () => { control.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [key, tiles, layer, attempt]);
  const status = imagery.key === key ? imagery.status : "loading";
  const px = (lon: number) => (lon - west) / width * 1000;
  const py = (lat: number) => (south + height - lat) / height * 606;
  const area = anchor ?? site;
  const radius = anchor && hover ? distanceKm(anchor, hover) : site.radius;
  const rx = radius / (111.32 * Math.max(.01, Math.cos(area.lat * Math.PI / 180))) / width * 1000;
  const ry = radius / 111.32 / height * 606;
  function point(event: React.MouseEvent<SVGSVGElement>) {
    const r = svg.current!.getBoundingClientRect();
    return pointInView((event.clientX - r.left) / r.width, (event.clientY - r.top) / r.height, west, south, width, height);
  }
  function select(event: React.MouseEvent<SVGSVGElement>) {
    const p = point(event); setNotice("");
    if (mode === "circle") {
      if (!anchor) { setAnchor(p); setHover(p); return; }
      const distance = distanceKm(anchor, p);
      if (distance < 1 || distance > 25) { setNotice(`El radio es ${distance.toFixed(1)} km. Acerca el mapa y elige un borde entre 1 y 25 km; el centro sigue seleccionado.`); return; }
      setSite({ name: "Área personalizada", lat: anchor.lat, lon: anchor.lon, radius: +distance.toFixed(2) });
      setSpan(Math.min(100, Math.max(.08, distance / 111.32 * 4, distance / (111.32 * Math.max(.01, Math.cos(anchor.lat * Math.PI / 180))) * 4 / 1.65)));
      setAnchor(null); setHover(null);
    } else setSite({ ...site, name: "Área personalizada", lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5) });
  }
  function fit() {
    setAnchor(null); setHover(null); 
    setSpan(Math.min(100, Math.max(.08, site.radius / 111.32 * 4, site.radius / (111.32 * Math.max(.01, Math.cos(site.lat * Math.PI / 180))) * 4 / 1.65)));
  }
  return <div className="min-w-0 p-4 xl:col-start-1">
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3"><Message id="earthMap" /></h1>
    <div className="mb-3 flex flex-wrap gap-2 [&_button]:border [&_button]:border-slate-300 [&_button]:bg-white [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-xs [&_button[aria-pressed=true]]:bg-sky-50"><button aria-pressed={mode === "point"} onClick={() => { setMode("point"); setAnchor(null); setHover(null); setNotice(""); }}><Message id="selectCenter" /></button><button aria-pressed={mode === "circle"} onClick={() => { setMode("circle"); setAnchor(null); setHover(null); setNotice(""); }}><Message id="drawArea2Clicks" /></button><button onClick={fit}><Message id="fitSelectedArea" /></button>{anchor && <button onClick={() => { setAnchor(null); setHover(null); }}><Message id="cancelDrawing" /></button>}</div>
    <div className="relative h-[clamp(320px,58dvh,720px)] overflow-hidden border border-slate-200 bg-[#e3e8e0] [&>svg]:h-full [&>svg]:w-full [&>svg]:cursor-crosshair [&_image]:saturate-75">
      <svg ref={svg} viewBox="0 0 1000 606" preserveAspectRatio="none" role="img" aria-label={sourceText("Mapa terrestre interactivo. Alternativa accesible: campos de latitud, longitud y radio del panel.")} onClick={select} onMouseMove={e => { if (anchor) setHover(point(e)); }}>
        <defs><pattern id="grid" width="100" height="101" patternUnits="userSpaceOnUse"><path d="M100 0H0V101" fill="none" stroke="#d4e2e5" strokeOpacity=".12" strokeWidth=".6"/></pattern></defs>
        {imagery.key === key && imagery.tiles?.map((tile, i) => <image key={i} href={tile.src} x={tile.x} y={tile.y} width={tile.width} height={tile.height} preserveAspectRatio="none"/>)}
        <rect width="1000" height="606" fill="url(#grid)"/>
        {candidates.map(s => <circle key={s.name} cx={px(s.lon)} cy={py(s.lat)} r="4" fill="#e4ded0" opacity=".7"/>)}
        <ellipse cx={px(area.lon)} cy={py(area.lat)} rx={Math.max(rx, 2)} ry={Math.max(ry, 2)} fill="#287bb7" fillOpacity=".16" stroke="#287bb7" strokeWidth="1.5" strokeDasharray={anchor ? "5 4" : undefined}/>
        <circle cx={px(area.lon)} cy={py(area.lat)} r="4" fill="#287bb7"/>
        {result?.site.lat === site.lat && result.site.lon === site.lon && result.site.radius === site.radius && result.terrain?.samples.map((s, i) => <circle key={i} cx={px(s.lon)} cy={py(s.lat)} r="2.5" fill={s.elevation === null ? "#efbc86" : "#fff"}/>)}
      </svg>
      
      <div className="pointer-events-none absolute bottom-16 left-4 grid max-w-[75%] gap-1 border border-slate-200 bg-white/95 p-3 text-xs [&_strong]:text-base"><strong>{sourceText(site.name)}</strong><span>{Math.abs(site.lat).toFixed(4)}° {site.lat < 0 ? "S" : "N"} &nbsp; {Math.abs(site.lon).toFixed(4)}° {site.lon < 0 ? "O" : "E"}</span><small><Message id="radius" /> {site.radius} <Message id="kmApprox" /> {Math.round(Math.PI * site.radius ** 2)} km²</small></div>
      <div className="absolute top-4 right-4 grid border border-slate-200 bg-white [&_button]:border-b [&_button]:border-slate-200 [&_button]:px-2 [&_button]:py-1.5 [&_button:hover]:bg-sky-50"><button aria-label={sourceText("Acercar mapa")} onClick={() => setSpan(v => Math.max(.08, v / 2))}>+</button><button aria-label={sourceText("Alejar mapa")} onClick={() => setSpan(v => Math.min(100, v * 2))}>−</button></div>
      <div className="pointer-events-none absolute top-4 left-4 grid text-center text-xs">N<span>↑</span></div>
      {status === "error" && <div className="absolute inset-x-12 top-4 flex flex-wrap items-center gap-2 border border-slate-200 bg-white p-3 text-xs [&_a]:text-black" role="alert"><Message id="nasaGibsImageryIsUnavailableTheGridDoes" /><button className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-100" onClick={() => setAttempt(v => v + 1)}><Message id="retryImagery" /></button><a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer"><Message id="openNasaWorldview" /></a></div>}
      {status === "loading" && <div className="absolute top-4 left-12 bg-white p-2 text-xs" role="status"><Message id="loadingNasaGibsUpTo23S" /></div>}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 p-2 text-xs [&_select]:max-w-full [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:p-1"><span>{mode === "circle" ? anchor ? translate("terrainEdge", { radius: radius.toFixed(1) }) : sourceText("1/2 · Elige el centro del círculo") : sourceText("Clic para seleccionar centro")}</span><select aria-label={sourceText("Capa de imagen")} value={layer} onChange={e => setLayer(e.target.value)}><option value="BlueMarble_ShadedRelief_Bathymetry"><Message id="blueMarbleHistoricalMosaic" /></option><option value="MODIS_Terra_CorrectedReflectance_TrueColor"><Message id="modisJul12025" /></option></select></div>
    </div>
    {notice && <p className="my-3 border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-black" role="status">{notice}</p>}
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] text-black"><span><Message id="imageryNasaGibsEsdisEpsg4326VisualContext" /></span><span><Message id="gibsRegionalContext500MBlueMarble250" /></span></div>
  </div>;
}
