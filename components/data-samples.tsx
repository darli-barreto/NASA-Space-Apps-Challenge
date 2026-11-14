import type { ElevationPoint } from "@/lib/analog-math";
import DataTable from "./data-table";

const number = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 6 });
export const measure = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? number.format(value) : "—";

export default function DataSamples({ title, groups }: {
  title: string;
  groups: { label: string; samples: ElevationPoint[] }[];
}) {
  return <DataTable title={title} columns={["Sitio", "Nodo", "Latitud (°)", "Longitud (°)", "Elevación (m)"]}
    rows={groups.flatMap(({ label, samples }) => samples.map((point, index) => [
      label, index + 1, measure(point.lat), measure(point.lon), measure(point.elevation),
    ]))} />;
}
