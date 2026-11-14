import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import geology from "@/data/pilot-geology.json";
import ReportSection from "./report-section";

export default function GeologyEvidence() {
  const { earth, moon, limits } = geology;

  return (
    <ReportSection subsection title={<SourceText value="Geología de los dos sitios" />}>
      <dl className="my-3 grid gap-3 sm:grid-cols-2">
        <div className="border border-slate-200 p-3">
          <dt className="font-semibold">Andagua · INGEMMET #55742</dt>
          <dd>{earth.classification}.</dd>
          <dd className="my-2 text-xs leading-relaxed text-black">
            <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={earth.classificationUrl} target="_blank" rel="noreferrer">
              <Message id="landformClassification" />
            </a>{" · "}
            <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={earth.bulletinUrl} target="_blank" rel="noreferrer">
              <Message id="mapSheet" /> {earth.sheet} · {earth.scale}
            </a>
          </dd>
        </div>
        <div className="border border-slate-200 p-3">
          <dt className="font-semibold"><Message id="monsMoutonMoon" /></dt>
          <dd>{moon.interpretation}</dd>
          <dd className="my-2 text-xs leading-relaxed text-black">
            <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={moon.studyUrl} target="_blank" rel="noreferrer">
              <Message id="geologicalStudyOfMonsMouton" /> {moon.scale}
            </a>
          </dd>
        </div>
      </dl>
      <p className="my-2 text-xs leading-relaxed text-black">{limits}</p>
    </ReportSection>
  );
}
