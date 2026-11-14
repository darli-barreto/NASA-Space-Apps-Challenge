import Image from "next/image";
import { useState } from "react";
import { offsetPoint, type ElevationPoint, type GeoPoint } from "@/lib/analog-math";
import { comparisonFrame, comparisonImageSources, comparisonImageTiles, type ImageBody } from "@/lib/comparison-imagery";

export type PhotoSite = {
  label: string;
  center: GeoPoint;
  radiusKm: number;
  body: ImageBody;
  samples: readonly ElevationPoint[];
};

const km = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
// Serialize the display geometry at subpixel precision in Node and the browser.
const displayCoordinate = (value: number) => Number(value.toFixed(4));
const svgPoint = ({ x, y }: { x: number; y: number }) =>
  `${displayCoordinate(x)},${displayCoordinate(y)}`;

export default function ComparisonPhoto({ site, spacingKm }: { site: PhotoSite; spacingKm: number }) {
  const [failed, setFailed] = useState<string[]>([]);
  const { center, radiusKm, body, samples } = site;
  const source = comparisonImageSources[body];
  const frame = comparisonFrame(center, radiusKm, spacingKm);
  const tiles = comparisonImageTiles(body, frame);
  const points = samples.map(frame.project);
  const outline = [0, 2, 8, 6].flatMap(i => points[i] ? [svgPoint(points[i])] : []).join(" ");
  const radius = Array.from({ length: 64 }, (_, index) => {
    const angle = index * Math.PI / 32;
    return svgPoint(frame.project(offsetPoint(center, radiusKm, Math.sin(angle) * spacingKm, Math.cos(angle) * spacingKm)));
  }).join(" ");
  const drawable = tiles.length > failed.length;

  return (
    <section className="min-w-0">
      <h3 className="mb-1 text-sm font-semibold">{site.label}</h3>
      <div className="relative aspect-square w-full overflow-hidden border border-slate-300 bg-slate-100">
        {tiles.filter(tile => !failed.includes(tile.src)).map(tile => (
          <Image
            alt=""
            key={tile.src}
            src={tile.src}
            unoptimized
            width={512}
            height={512}
            className="absolute max-w-none"
            style={{ left: `${displayCoordinate(tile.x)}%`, top: `${displayCoordinate(tile.y)}%`, width: `${displayCoordinate(tile.width)}%`, height: `${displayCoordinate(tile.height)}%` }}
            onError={() => setFailed(previous => previous.includes(tile.src) ? previous : [...previous, tile.src])}
          />
        ))}
        {drawable && (
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" role="img" aria-label={`Vista orbital. Malla de ${km.format(spacingKm * 2)} kilómetros de lado y radio interior de ${km.format(spacingKm)} kilómetros.`}>
            <polygon points={outline} fill="none" stroke="#151515" strokeWidth="1.6" />
            <polygon points={outline} fill="none" stroke="#fff" strokeWidth=".65" />
            <polygon points={radius} fill="none" stroke="#151515" strokeWidth="1.3" strokeDasharray="2 2" />
            <polygon points={radius} fill="none" stroke="#fff" strokeWidth=".6" strokeDasharray="2 2" />
            {points.map(({ x, y }, index) => <circle key={index} cx={displayCoordinate(x)} cy={displayCoordinate(y)} r={index === 4 ? 1.85 : 1.05} fill="#fff" stroke="#151515" strokeWidth=".55" />)}
          </svg>
        )}
        {drawable && <span className="absolute right-1 top-1 bg-white px-1 text-xs text-black">N ↑</span>}
        {!!failed.length && (
          <div className="absolute inset-x-0 bottom-0 bg-white p-1 text-center text-xs" role="status">
            {drawable ? "Imagen parcial" : "Imagen no disponible"}
          </div>
        )}
      </div>
      <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
      <p className="text-xs">{source.credit}</p>
    </section>
  );
}
