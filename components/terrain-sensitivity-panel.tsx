import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import { pilotTerrainSensitivity } from "@/lib/pilot-terrain-sensitivity";
import ReportSection from "./report-section";

const format = (n: number | null) => n === null ? "Sin datos" :
  n.toLocaleString("es-PE", { maximumFractionDigits: 2, signDisplay: "exceptZero" });

const products = [
  { id: "glo30", name: "GLO‑30" },
  { id: "aw3d30", name: "AW3D30" },
];

export default function TerrainSensitivityPanel() {
  return <ReportSection subsection title={<SourceText value="Sensibilidad al muestreo y la ubicación" />}>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="firstTheSpacingChangesWithinAFixed4" /></p>
    <div className="overflow-x-auto">
      <table className="my-3 w-full table-fixed border-collapse text-xs [&_td]:p-2 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_tr]:border-b [&_tr]:border-slate-200">
        <caption className="mb-2 text-left text-xs text-black"><Message id="earthMinusLolaEachCellShowsReliefM" /></caption>
        <thead><tr><th scope="col"><Message id="scenario" /></th>{products.map(product => <th scope="col" key={product.id}>{product.name}</th>)}</tr></thead>
        <tbody>{pilotTerrainSensitivity.scenarios.map(scenario => <tr key={[scenario.group, scenario.spacingM, scenario.offsetEastM, scenario.offsetNorthM].join(":")}>
          <th scope="row">{scenario.group === "spacing" ? `Ventana 4 km · paso ${scenario.spacingM} m` :
            `Ventana 2 km · E ${format(scenario.offsetEastM)} m, N ${format(scenario.offsetNorthM)} m`}</th>
          {products.map(product => {
            const result = scenario.contrasts.find(row => row.id === product.id);
            return <td key={product.id}>{format(result?.reliefDeltaM ?? null)} / {format(result?.gradientDeltaDeg ?? null)}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="aPositiveDifferenceIndicatesAHigherEarthMeasurement" /></p>
  </ReportSection>;
}
