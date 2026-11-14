import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import Image from "next/image";
import { evidenceDimensions } from "@/lib/evidence-dimensions";
import pilot from "@/data/pilot-evidence.json";
import { TerrainComparison } from "./terrain-comparison";

import TerrainSensitivityPanel from "./terrain-sensitivity-panel";
import RadarEvidence from "./radar-evidence";
import GeologyEvidence from "./geology-evidence";
import MineralogyEvidence from "./mineralogy-evidence";
import ReportSection from "./report-section";

const classifications: Record<string, string> = {
  "0": "Sin dato", "1": "Saturado o defectuoso", "2": "Píxeles oscuros",
  "3": "Sombra de nube", "4": "Vegetación", "5": "Superficie sin vegetación",
  "6": "Agua", "7": "Sin clasificar", "8": "Nube probable",
  "9": "Nube", "10": "Cirro", "11": "Nieve o hielo",
};

export default function PilotEvidence() {
  const { sentinel, lroc, terrain, side, spacingM } = pilot;
  return <ReportSection title={<SourceText value="Evidencia ampliada de Andagua y Mons Mouton" />}>
    <TerrainComparison series={terrain} side={side} spacingM={spacingM} />

    <TerrainSensitivityPanel />
    <GeologyEvidence />
    <MineralogyEvidence />
    <ReportSection subsection title={<SourceText value="Fuentes y créditos del mapa" />}>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="approximate44KmWindowTheSourcesShare" /></p>
    <ul className="my-3 flex flex-wrap gap-3">
      {terrain.map(product => <li key={product.id}><a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={product.source} target="_blank" rel="noreferrer">{product.name}</a></li>)}
    </ul>
    {Object.keys(pilot.failures).length > 0 && <p className="my-2 text-xs leading-relaxed text-black"><Message id="productsWithoutAnAvailableExtract" /> {Object.keys(pilot.failures).join(", ")}.</p>}
    <p className="my-2 text-xs leading-relaxed text-black">Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. AW3D30 © JAXA.</p>
    </ReportSection>
    <div className="grid gap-3 sm:grid-cols-2">
      {sentinel && <figure>
        <Image src={sentinel.preview} alt="Ventana terrestre del candidato INGEMMET 55742" width={440} height={440} className="aspect-square w-full border border-slate-200 object-contain" />
        <figcaption className="my-2 text-xs leading-relaxed text-black"><a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={sentinel.source} target="_blank" rel="noreferrer">Sentinel-2 L2A</a> · {sentinel.datetime.slice(0, 10)}<Message id="containsModifiedCopernicusSentinelData" /></figcaption>
      </figure>}
      <figure>
        <a href={lroc.preview} target="_blank" rel="noreferrer">
          <Image unoptimized src={lroc.preview} alt="Vista regional del mosaico lunar LROC de la meseta de Mons Mouton" width={440} height={440} className="aspect-square w-full border border-slate-200 object-contain" />
        </a>
        <figcaption className="my-2 text-xs leading-relaxed text-black"><a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={lroc.source} target="_blank" rel="noreferrer">LROC NAC · NASA/GSFC/ASU/Intuitive Machines</a> <Message id="regionalViewSourceResolution" /> {lroc.nativePixelM} <Message id="mPixelScenes" /> {lroc.from} a {lroc.to}<Message id="theVisualScaleDiffersFromSentinel2" /></figcaption>
      </figure>
    </div>
    {sentinel && <p className="my-2 text-xs leading-relaxed text-black"><Message id="sentinel2ClassificationAt" /> {side ** 2} <Message id="nodes" /> {Object.entries(sentinel.classification).map(([code, count]) => `${classifications[code] ?? code} ${count}`).join(" · ")}<Message id="countsReferToSamplePoints" /></p>}
    <RadarEvidence />
    <ReportSection subsection title={<SourceText value="Cobertura de evidencia" />}>
    <dl className="mt-3 divide-y divide-slate-200 text-xs">
      {evidenceDimensions.map(([name, note]) => <div className="py-2" key={name}><dt className="font-medium"><SourceText value={name} /></dt><dd className="mt-1 text-black"><SourceText value={note} /></dd></div>)}
    </dl>
    </ReportSection>
  </ReportSection>;
}
