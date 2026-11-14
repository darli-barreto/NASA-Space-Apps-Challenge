import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import earth from "@/data/pilot-earth-materials.json";
import moon from "@/data/pilot-lunar-mineralogy.json";
import ReportSection from "./report-section";

const formatPercent = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

export default function MineralogyEvidence() {
  const total = moon.grid.rows * moon.grid.columns;

  return (
    <ReportSection subsection title={<SourceText value="Mineralogía y materiales" />}>
      <div className="my-3 grid gap-3 sm:grid-cols-2">
        <section className="border border-slate-200 p-3">
          <h3 className="font-semibold"><Message id="andaguaHuajanaRock" /></h3>
          <p>{earth.observations}</p>
          <p className="my-2 text-xs leading-relaxed text-black">{earth.scope}</p>
          <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={earth.source} target="_blank" rel="noreferrer">
            <Message id="sampleStudy" /> {earth.sampleId}
          </a>
        </section>
        <section className="border border-slate-200 p-3">
          <h3 className="font-semibold"><Message id="monsMoutonRegolith" /></h3>
          <dl className="my-1 divide-y divide-slate-200">
            {moon.layers.map(layer => (
              <div key={layer.id} className="flex flex-wrap items-baseline justify-between gap-x-2 py-1">
                <dt>{layer.label}</dt>
                <dd className="tabular-nums">
                  {layer.mean === null ? "Sin dato" : `${formatPercent.format(layer.mean)} % en masa`}
                  <small> · {layer.validCells}/{total} <Message id="cells" /></small>
                </dd>
              </div>
            ))}
          </dl>
          <p className="my-2 text-xs leading-relaxed text-black"><Message id="kaguyaLolaEstimate44KmWindow1" /></p>
          <p className="my-2 text-xs leading-relaxed text-black"><Message id="mineralogyModelRootMeanSquareError" /> {moon.mineralAbundanceModelRmseWtPct} <Message id="percentagePoints" /></p>
          <div className="flex flex-wrap gap-x-3">
            <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={moon.datasetUrl} target="_blank" rel="noreferrer"><Message id="originalMaps" /></a>
            <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={moon.studyUrl} target="_blank" rel="noreferrer"><Message id="estimationMethod" /></a>
          </div>
        </section>
      </div>
      <p className="my-2 text-xs leading-relaxed text-black">{earth.interpretation}</p>
    </ReportSection>
  );
}
