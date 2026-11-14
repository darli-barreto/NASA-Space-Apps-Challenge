import { Message } from "@/components/message";
import { terrainMetrics, terrainMetricLabels } from "@/lib/terrain-metrics";

const labels = Object.entries(terrainMetricLabels) as [keyof typeof terrainMetricLabels, string][];
const fmt = (n: number) => n.toLocaleString("es-PE", { maximumFractionDigits: 2 });

export function TerrainComparison({ series, side, spacingM }: {
  series: { name: string; values: (number | null)[] }[];
  side: number;
  spacingM: number;
}) {
  const columns = series.map(({ name, values }) => ({ name, metrics: terrainMetrics(values, side, spacingM) }));
  return <div className="overflow-x-auto">
    <table className="my-3 w-full table-fixed border-collapse text-xs [&_td]:p-2 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_tr]:border-b [&_tr]:border-slate-200">
      <caption className="mb-2 text-left text-xs text-black"><Message id="grid" /> {side} × {side} <Message id="spacing" /> {spacingM.toLocaleString("es-PE")} m</caption>
      <thead><tr><th scope="col"><Message id="metric" /></th>{columns.map(column => <th scope="col" key={column.name}>{column.name}</th>)}</tr></thead>
      <tbody>{labels.map(([key, label]) => <tr key={key}>
        <th scope="row">{label}</th>
        {columns.map(column => <td key={column.name}>{column.metrics ? fmt(column.metrics[key]) : "Sin datos"}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}
