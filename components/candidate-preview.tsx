import { useSourceText } from "./source-text";
import { Message } from "@/components/message";
import Image from "next/image";
import { useState } from "react";
import type { AnalogCandidate } from "@/lib/analog-search";
import { satelliteUrl, worldImagery } from "@/lib/comparison-imagery";
import ComparisonPhoto from "./comparison-photo";
import { primaryActionClass } from "./primitives";

const groundWidths = [750, 1500, 3000, 6000];

export default function CandidatePreview({ site, spacingKm }: {
  site: AnalogCandidate;
  spacingKm: number;
}) {
  const sourceText = useSourceText();
  const [zoom, setZoom] = useState(1);
  const [failedImage, setFailedImage] = useState<string>();
  const label = site.id === 55742 ? "Andagua" : `INGEMMET #${site.id}`;
  const width = groundWidths[zoom];
  const src = satelliteUrl(site.lat, site.lon, width);
  const mapsQuery = new URLSearchParams({ api: "1", query: `${site.lat},${site.lon}` });

  return (
    <>
      {failedImage === src ? (
        <>
          <ComparisonPhoto spacingKm={spacingKm} site={{
            label, body: "earth", radiusKm: 6371, center: site, samples: site.samples,
          }} />
        </>
      ) : (
        <>
          <h3 className="mb-1 text-sm font-semibold">{label}</h3>
          <div className="relative aspect-square w-full overflow-hidden border border-slate-300 bg-slate-100">
            <Image key={src} src={src} alt={`Vista satelital de ${label}`} fill unoptimized
              onError={() => setFailedImage(src)} />
            <span aria-label={sourceText("Ubicación del candidato")} role="img"
              className="pointer-events-none absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 ring-2 ring-black/70" />
            <div className="absolute top-2 right-2 flex flex-col divide-y divide-slate-200 rounded bg-white shadow-sm">
              <button type="button" aria-label={sourceText("Acercar vista satelital")} disabled={zoom === 0}
                className="size-10 text-lg" onClick={() => setZoom(zoom - 1)}>+</button>
              <button type="button" aria-label={sourceText("Alejar vista satelital")} disabled={zoom === groundWidths.length - 1}
                className="size-10 text-lg" onClick={() => setZoom(zoom + 1)}>−</button>
            </div>
            <a href={worldImagery} target="_blank" rel="noreferrer"
              className="absolute right-0 bottom-0 max-w-full bg-white/95 px-1 text-right text-[10px] underline">
              <Message id="esriMaxarEarthstarGeographicsAndTheGisCommunity" />
            </a>
          </div>
          <p className="mt-1 text-xs"><Message id="view" /> {width < 1000 ? `${width} m` : `${width / 1000} km`} <Message id="wide" /></p>
        </>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 text-sm">
        <span className="tabular-nums">{site.lat.toFixed(5)}°, {site.lon.toFixed(5)}°</span>
        <a href={`https://www.google.com/maps/search/?${mapsQuery}`} target="_blank" rel="noreferrer"
          className={`${primaryActionClass} ml-auto`}>
          <Message id="openInGoogleMaps" />
        </a>
      </div>
    </>
  );
}
