import { useSourceText } from "./source-text";
import { Message } from "@/components/message";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import boundary from "@/data/peru-boundary.json";
import type { AnalogCandidate } from "@/lib/analog-search";
import { gibsTiles } from "@/lib/geography";
import { candidateName } from "@/lib/workspace-routes";

const west = -92.145;
const east = -55.855;
const south = -20;
const north = 2;
const width = 800;
const height = 485;
const x = (longitude: number) => (longitude - west) * width / (east - west);
const y = (latitude: number) => (north - latitude) * height / (north - south);
const outline = boundary.map(([longitude, latitude]) => `${x(longitude).toFixed(2)},${y(latitude).toFixed(2)}`).join(" ");
const layer = "BlueMarble_ShadedRelief_Bathymetry";
const imageryUrl = `/api/imagery?layer=${layer}&bbox=${west},${south},${east},${north}`;
const initialView = { x: width / 2, y: height / 2, zoom: 1 };
type View = typeof initialView;

function boundedView(view: View, frameWidth: number, frameHeight: number): View {
  const halfWidth = Math.min(frameWidth / (2 * view.zoom), (x(-44) - x(-106)) / 2);
  const halfHeight = Math.min(frameHeight / (2 * view.zoom), (y(-32) - y(13)) / 2);
  return {
    ...view,
    x: Math.max(x(-106) + halfWidth, Math.min(x(-44) - halfWidth, view.x)),
    y: Math.max(y(13) + halfHeight, Math.min(y(-32) - halfHeight, view.y)),
  };
}

export default function PeruOverview({ sites, select }: {
  sites: AnalogCandidate[];
  select: (id: number) => void;
}) {
  const sourceText = useSourceText();
  const [view, setView] = useState(initialView);
  const [aspect, setAspect] = useState(width / height);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; unit: number; view: View } | null>(null);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setAspect(width / height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const frameHeight = Math.max(height, 540 / aspect);
  const frameWidth = frameHeight * aspect;
  const visible = boundedView(view, frameWidth, frameHeight);
  const viewWidth = frameWidth / view.zoom;
  const viewHeight = frameHeight / view.zoom;
  const left = visible.x - viewWidth / 2;
  const top = visible.y - viewHeight / 2;
  const isInitial = view === initialView || (view.zoom === 1 && view.x === initialView.x && view.y === initialView.y);
  const covered = left >= 0 && top >= 0 && left + viewWidth <= width && top + viewHeight <= height;
  const tiles = isInitial && covered ? [] : gibsTiles(
    west + left / width * (east - west),
    north - (top + viewHeight) / height * (north - south),
    viewWidth / width * (east - west),
    viewHeight / height * (north - south),
  );

  function zoomBy(factor: number) {
    setView(current => boundedView({ ...boundedView(current, frameWidth, frameHeight), zoom: Math.max(1, Math.min(16, current.zoom * factor)) }, frameWidth, frameHeight));
  }

  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as Element).closest("[role=button]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view: visible,
      unit: viewWidth / event.currentTarget.getBoundingClientRect().width };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (start?.id !== event.pointerId) return;
    setView(boundedView({ ...start.view,
      x: start.view.x - (event.clientX - start.x) * start.unit,
      y: start.view.y - (event.clientY - start.y) * start.unit,
    }, frameWidth, frameHeight));
  }

  function stopDrag(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  }

  return (
    <figure className="relative min-h-0 lg:h-full">
        <div ref={viewport} className="relative aspect-[800/485] w-full overflow-hidden bg-[#e7f0f7] lg:aspect-auto lg:h-full">
          <svg viewBox={`${left} ${top} ${viewWidth} ${viewHeight}`} role="group" tabIndex={0}
            aria-label={sourceText("Mapa interactivo de Perú. Usa las flechas para moverte y los botones para cambiar el zoom.")}
            className={`absolute inset-0 h-full w-full touch-none select-none ${dragging ? "cursor-grabbing" : "cursor-grab"} focus-visible:-outline-offset-2`}
            onPointerDown={startDrag} onPointerMove={moveDrag} onLostPointerCapture={stopDrag}
            onDoubleClick={event => { if (!(event.target as Element).closest("[role=button]")) zoomBy(2); }}
            onKeyDown={event => {
              if (event.target !== event.currentTarget) return;
              const offsets: Record<string, [number, number]> = {
                ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
              };
              const offset = offsets[event.key];
              if (!offset) return;
              event.preventDefault();
              setView(boundedView({ ...visible, x: visible.x + offset[0] * viewWidth / 6, y: visible.y + offset[1] * viewHeight / 6 }, frameWidth, frameHeight));
            }}>
            <image href={imageryUrl} width={width} height={height} />
            {tiles.map(tile => (
              <image key={`${tile.z}/${tile.row}/${tile.col}`}
                href={`/api/imagery?layer=${layer}&z=${tile.z}&row=${tile.row}&col=${tile.col}`}
                x={left + tile.x / 1000 * viewWidth} y={top + tile.y / 606 * viewHeight}
                width={tile.width / 1000 * viewWidth} height={tile.height / 606 * viewHeight}
                preserveAspectRatio="none" />
            ))}
            <polygon points={outline} fill="#bbd3ea" fillOpacity=".25" stroke="#213d59" strokeWidth="4"
              vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <polygon points={outline} fill="none" stroke="#fff" strokeWidth="2"
              vectorEffect="non-scaling-stroke" pointerEvents="none" />
            {view.zoom <= 2 && <text x={x(-75.5)} y={y(-9.5)} fill="#fff" stroke="#182b24" strokeWidth="4"
              paintOrder="stroke" textAnchor="middle" fontSize="26" fontWeight="600" pointerEvents="none"><Message id="peru" /></text>}
            {sites.map(site => (
              <circle key={site.id} cx={x(site.lon)} cy={y(site.lat)} r={10 / view.zoom}
                role="button" tabIndex={0} aria-label={`Ver ${candidateName(site.id)}`}
                className="cursor-pointer fill-[#0042A6] stroke-white hover:fill-[#1b2b85] focus-visible:fill-[#1b2b85]"
                strokeWidth="2" vectorEffect="non-scaling-stroke" onClick={() => select(site.id)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(site.id);
                  }
                }} />
            ))}
          </svg>
          <div className="absolute top-2 right-2 grid divide-y divide-slate-200 rounded border border-slate-300 bg-white shadow-sm">
            <button type="button" onClick={() => zoomBy(2)} disabled={view.zoom === 16}
              aria-label={sourceText("Acercar mapa de Perú")} className="size-10 text-lg hover:bg-blue-50">+</button>
            <button type="button" onClick={() => zoomBy(0.5)} disabled={view.zoom === 1}
              aria-label={sourceText("Alejar mapa de Perú")} className="size-10 text-lg hover:bg-blue-50">−</button>
          </div>
          <button type="button" onClick={() => setView(initialView)} disabled={isInitial}
            className="absolute bottom-2 left-2 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-blue-50 disabled:invisible">
            <Message id="resetView" />
          </button>
        </div>
      <figcaption className="absolute right-0 bottom-0 rounded-tl bg-white/95 px-2 py-1 text-xs text-slate-700">
        <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="underline">NASA GIBS</a>
        {" · "}
        <a href="https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/" target="_blank" rel="noreferrer" className="underline">Natural Earth</a>
      </figcaption>
    </figure>
  );
}
