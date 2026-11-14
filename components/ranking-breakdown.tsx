import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import type { terrainDistanceBreakdown } from "@/lib/analog-math";
import { mobilityProfile, type assessMobility } from "@/lib/mobility-assessment";

const rankingIds = { relief: "reliefM", highGradient: "p90GradientDeg" } as const;
const values = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
const weights = new Intl.NumberFormat("es-PE", { style: "percent" });

export default function RankingBreakdown({ score, mobility, body }: {
  score: NonNullable<ReturnType<typeof terrainDistanceBreakdown>>;
  mobility: ReturnType<typeof assessMobility>;
  body: string;
}) {
  const measurement = (value: number | undefined, unit: string) =>
    value === undefined ? "—" : `${values.format(value)}${unit === "°" ? "°" : ` ${unit}`}`;
  return (
    <div className="mt-3 rounded-sm border border-slate-200">
      <table className="w-full table-fixed text-right text-xs tabular-nums [&_td]:px-1 [&_td]:py-2 [&_th]:px-1 [&_th]:py-2">
        <caption className="px-2 py-2 text-left text-sm font-semibold"><Message id="variablesAndWeights" /></caption>
        <thead className="bg-slate-50 [overflow-wrap:anywhere]">
          <tr>
            <th scope="col" className="w-[30%] text-left"><Message id="variable" /></th>
            <th scope="col"><Message id="earth" /></th>
            <th scope="col"><SourceText value={body} /></th>
            <th scope="col"><Message id="ranking" /></th>
            <th scope="col"><Message id="mobility" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {mobilityProfile.terrainVariables.map(variable => {
            const metric = mobility.variables.find(row => row.id === variable.id);
            const rankingId = variable.id === "relief" || variable.id === "highGradient"
              ? rankingIds[variable.id] : undefined;
            const ranking = score.metrics.find(row => row.id === rankingId);
            return (
              <tr key={variable.id}>
                <th scope="row" className="text-left font-medium"><SourceText value={variable.label} /></th>
                <td>{measurement(metric?.earth ?? ranking?.earth, variable.unit)}</td>
                <td>{measurement(metric?.reference ?? ranking?.reference, variable.unit)}</td>
                <td>{weights.format(ranking?.weight ?? 0)}</td>
                <td>{weights.format(variable.weight / 100)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-slate-200">
          <tr>
            <th scope="row" colSpan={3} className="text-left"><Message id="calculatedDistance" /></th>
            <td className="font-semibold">{score.distance.toFixed(3)}</td>
            <td className="font-semibold">{mobility.partialDistance?.toFixed(3) ?? "—"}</td>
          </tr>
        </tfoot>
      </table>
      <p className="px-2 pb-2 text-xs"><Message id="theRankingOrdersTheReportsTheMobilityWeights" /></p>
    </div>
  );
}
