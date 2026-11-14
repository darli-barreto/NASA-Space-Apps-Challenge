import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import Image from "next/image";
import radar from "@/data/pilot-radar.json";
import { quantile } from "@/lib/analog-math";
import LendEvidence from "./lend-evidence";
import ReportSection from "./report-section";

const values = radar.miniRf.values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
const fmt = (value: number) => value.toLocaleString("es-PE", { maximumFractionDigits: 3 });

export default function RadarEvidence() {
  const { radarsat, miniRf } = radar;
  return <ReportSection subsection title={<SourceText value="Radar y recursos" />}>
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <figure>
        <Image src={radarsat.preview} alt="Recorte de radar RADARSAT-1 del candidato peruano" width={440} height={440} className="h-auto w-full border border-slate-200" />
        <figcaption className="my-2 text-xs leading-relaxed text-black">
          <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={radarsat.source} target="_blank" rel="noreferrer"><Message id="radarsat1CanadianArchive" /></a>
          {" · "}{radarsat.date.slice(0, 10)} <Message id="band" /> {radarsat.frequencyBand}, {radarsat.polarizations.join(", ")}<Message id="catalogResolution" /> {radarsat.resolutionM} <Message id="mContrastEnhancedInspectionCropWithApproximateGeoreferencing" />
        </figcaption>
      </figure>
      <div>
        <h3 className="text-sm font-semibold">Mini‑RF · Mons Mouton</h3>
        <p className="my-2 text-xs leading-relaxed text-black"><Message id="circularPolarizationRatioCprBand" /> {miniRf.band}. {values.length} / {miniRf.values.length} <Message id="nodesWithMosaicData" /></p>
        {values.length > 0 && <p className="my-2 text-sm leading-relaxed text-black">CPR P10 {fmt(quantile(values, .1))} <Message id="median" /> {fmt(quantile(values, .5))} · P90 {fmt(quantile(values, .9))}.</p>}
        <p className="my-2 text-xs leading-relaxed text-black"><Message id="cprRespondsToSurfaceGeometryAndPropertiesEvaluating" /></p>
        <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={miniRf.labelUrl} target="_blank" rel="noreferrer"><Message id="miniRfMosaicLabel" /></a>
      </div>
    </div>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="rcmScenesReturnedByThePublicEodmsQuery" /> {radar.rcmMatches}<Message id="queriedOn" /> {radar.retrievedAt.slice(0, 10)}.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={radar.rcmSearch} target="_blank" rel="noreferrer"><Message id="rcmQuery" /></a>
      <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={radarsat.licence} target="_blank" rel="noreferrer"><Message id="radarsat1AccessAndLicense" /></a>
    </div>
    <LendEvidence />
  </ReportSection>;
}
