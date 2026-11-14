import { Message } from "@/components/message";
import pilot from "@/data/pilot-evidence.json";
import aggregated from "@/data/pilot-terrain-aggregated.json";
import mineralogy from "@/data/pilot-lunar-mineralogy.json";
import radar from "@/data/pilot-radar.json";
import { earthThermal, lunarThermal } from "@/lib/pilot-thermal";
import { measure } from "./data-samples";
import DataTable from "./data-table";

export default function PilotDataValues() {
  const thermal = [
    ...earthThermal.map(entry => ({ label: `MODIS Terra · ${entry.phase === "Day" ? "día" : "noche"}`, values: entry.statistics })),
    ...lunarThermal.map(entry => ({ label: `Diviner · ${entry.hourStart}–${entry.hourEnd} h solares lunares`, values: entry.statistics })),
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold"><Message id="andaguaMonsMoutonPilotValues" /></h2>
      <div className="space-y-2">
        <h3 className="font-semibold"><Message id="modelElevations" /></h3>
        <DataTable title="Elevaciones del piloto" columns={["Producto", "Separación (m)", "Nodo o celda", "Elevación (m)"]}
          rows={[pilot, aggregated].flatMap(dataset => dataset.terrain.flatMap(product => product.values.map((value, index) => [
            product.name, dataset.spacingM, index + 1, measure(value),
          ])))} />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold"><Message id="surfaceTemperature" /></h3>
        <DataTable title="Temperaturas de MODIS y Diviner" columns={["Producto y horario", "Muestras válidas", "Mín. (K)", "Mediana (K)", "Máx. (K)"]}
          rows={thermal.map(({ label, values }) => [label, values?.count ?? 0, measure(values?.min), measure(values?.median), measure(values?.max)])} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-semibold"><Message id="monsMoutonMineralogy" /></h3>
          <DataTable title="Estimaciones mineralógicas lunares" columns={["Mineral", "Media (% en masa)", "Celdas válidas"]}
            rows={mineralogy.layers.map(layer => [layer.label, measure(layer.mean), layer.validCells])} />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold"><Message id="lunarRadar" /></h3>
          <DataTable title="Muestras de radar Mini-RF" columns={["Nodo", "Razón de polarización circular"]}
            rows={radar.miniRf.values.map((value, index) => [index + 1, measure(value)])} />
        </div>
      </div>
    </section>
  );
}
