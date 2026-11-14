import { Message } from "@/components/message";
import { terrainControlReport } from "@/lib/terrain-control-report";
import { Card } from "./primitives";

const fmt = (value: number | null | undefined, digits = 2) =>
  value == null ? "Sin datos" : value.toLocaleString("es-PE", { maximumFractionDigits: digits });

function ReferenceControls({ report }: { report: typeof terrainControlReport.references[number] }) {
  const { rows, reference } = report;
  const { weights } = terrainControlReport;
  const leaders = weights.map((_, i) => {
    const valid = rows.filter(row => row.distances[i] !== null);
    const best = Math.min(...valid.map(row => row.distances[i]!));
    return valid.filter(row => Math.abs(row.distances[i]! - best) < 1e-9).map(row => row.name).join(" y ");
  });
  const name = reference.id === "moon-hadley" ? "Hadley" : "Mons Mouton";
  return <details open={reference.id === "moon-mons-mouton"} className="mt-3 border-t border-slate-200 pt-3">
    <summary className="cursor-pointer text-sm font-medium">{name}</summary>
    <p className="my-2 text-sm leading-relaxed text-black"><Message id="lunarReferenceAt" /> {fmt(reference.signature.reliefM)} <Message id="mReliefAnd" /> {fmt(reference.signature.p90GradientDeg)}<Message id="p90Gradient2" /></p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-left text-xs [&_th]:p-2 [&_td]:p-2 [&_tr]:border-b [&_tr]:border-slate-200">
        <caption className="mb-2 text-left text-xs text-black"><Message id="distanceForThreeReliefWeightsTheMainWeight" /></caption>
        <thead className="bg-slate-50"><tr>
          <th scope="col"><Message id="earthWindow" /></th><th scope="col"><Message id="reliefM" /></th><th scope="col"><Message id="p90Gradient3" /></th>
          {weights.map(weight => <th scope="col" key={weight}><Message id="weight" /> {fmt(weight)}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}>
          <th scope="row"><a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={row.source} target="_blank" rel="noreferrer">{row.name}</a>
            <span className="block font-normal text-black">{row.role}</span></th>
          <td>{fmt(row.metrics?.reliefM)}</td><td>{fmt(row.metrics?.p90GradientDeg)}</td>
          {row.distances.map((value, i) => <td key={weights[i]}>{fmt(value, 3)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="my-2 text-xs leading-relaxed text-black">{leaders[0] && leaders.every(leader => leader === leaders[0])
      ? `Menor distancia con los tres pesos: ${leaders[0]}.`
      : weights.map((weight, i) => `Peso ${fmt(weight)}: ${leaders[i] || "Sin datos"}`).join(" · ")}</p>
    <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={reference.source} target="_blank" rel="noreferrer"><Message id="lunarReferenceMetadata" /></a>
  </details>;
}

export default function TerrainControls() {
  const { references, source, retrievedAt, spacingKm } = terrainControlReport;
  return <Card>
    <h2 className="my-2 text-lg font-bold tracking-tight"><Message id="methodControls" /></h2>
    <p className="my-2 text-sm leading-relaxed text-black"><Message id="theSameThreeEarthWindowsAreComparedWith" /> {spacingKm} <Message id="kmApartALowerDistanceIndicatesGreaterSimilarity" /></p>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="nasaDocumentsKilaueaSBasalticLandscapeAlongsideHadley" /></p>
    {references.map(report => <ReferenceControls key={report.reference.id} report={report} />)}
    <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={source} target="_blank" rel="noreferrer"><Message id="recordedSrtmQuery" /> {retrievedAt.slice(0, 10)}</a>
  </Card>;
}
