import { useTranslations } from "next-intl";
import { useLanguage } from "./display-preferences";
import { terrainMetricLabels, type terrainMetrics } from "@/lib/terrain-metrics";

export const terrainNumber = (value: number | null | undefined) => value == null ? "—" :
  value.toLocaleString("es-PE", { maximumFractionDigits: 2 });
type Metrics = ReturnType<typeof terrainMetrics>;

export default function TerrainMetricTable({ series }: { series: { name: string; metrics: Metrics }[] }) {
  const { t } = useLanguage();
  const translate = useTranslations();
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[460px] text-left text-sm tabular-nums">
      <thead><tr className="border-b border-slate-300"><th className="py-3 pr-4 font-medium">{translate("metric2")}</th>
        {series.map(s => <th key={s.name} className="px-3 py-3 font-medium">{s.name}</th>)}</tr></thead>
      <tbody>{Object.entries(terrainMetricLabels).map(([key,label]) => {
        const id = key as keyof NonNullable<Metrics>;
        const english = { relief: "Total relief (m)", centralRelief: "P90–P10 relief (m)", medianGradient: "Median gradient (°)", highGradient: "P90 gradient (°)", localDeviation: "Deviation from neighbors (m RMS)" }[id];
        const max = Math.max(0, ...series.map(s => s.metrics?.[id] ?? 0));
        return <tr key={key} className="border-b border-slate-200">
          <th scope="row" className="py-3 pr-4 text-xs font-normal">{t(label, english)}</th>
          {series.map(s => <td key={s.name} className="px-3 py-3">
            <span>{terrainNumber(s.metrics?.[id])}</span>
            <div aria-hidden="true" className="mt-1 h-1 w-full bg-slate-100">
              <div className="h-1 bg-slate-600" style={{width:`${s.metrics && max > 0 ? s.metrics[id]/max*100 : 0}%`}} />
            </div>
          </td>)}
        </tr>;
      })}</tbody>
    </table>
    <p className="mt-2 text-xs">{translate("barsAreRelativeToTheMaximumInEach")}</p>
  </div>;
}
