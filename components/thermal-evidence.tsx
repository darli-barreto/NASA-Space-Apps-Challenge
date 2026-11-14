import { Message } from "@/components/message";
import { earthThermal, lunarThermal, pilotThermal } from "@/lib/pilot-thermal";

const fmt = (value: number) => value.toLocaleString("es-PE", { maximumFractionDigits: 1 });
const hour = (value: number) => {
  const minutes = Math.round(value * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};
const range = (values: number[] | null) => values ? values.map(hour).join("–") : "Sin datos";

export default function ThermalEvidence() {
  const rows = [
    ...earthThermal.map(row => ({ label: "MODIS · " + (row.phase === "Day" ? "día" : "noche"),
      hours: range(row.observedLocalHours), stats: row.statistics, possible: row.possibleCount })),
    ...lunarThermal.map(row => ({ label: "Diviner · " + (row.hourStart < 18 ? "mediodía" : "noche"),
      hours: range([row.hourStart, row.hourEnd]), stats: row.statistics, possible: null })),
  ];
  return <section className="mt-3">
    <div className="overflow-x-auto">
      <table className="my-3 w-full table-fixed border-collapse text-xs [&_td]:p-2 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_tr]:border-b [&_tr]:border-slate-200">
        <caption className="mb-2 text-left text-xs text-black"><Message id="minimumMedianAndMaximumIncludedValuesK" /></caption>
        <thead><tr><th scope="col"><Message id="product" /></th><th scope="col"><Message id="localTime" /></th><th scope="col"><Message id="minMedianMax" /></th><th scope="col"><Message id="includedData" /></th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}>
          <th scope="row">{row.label}</th><td>{row.hours}</td>
          <td>{row.stats ? [row.stats.min, row.stats.median, row.stats.max].map(fmt).join(" · ") : "Sin datos"}</td>
          <td>{row.stats?.count ?? 0}{row.possible === null ? " celdas" : ` / ${row.possible}`}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="modisTerraMod11a2061FourEightDayComposites" /> {earthThermal.map(row => `${row.phase === "Day" ? "día" : "noche"} ${row.strictCount}`).join(" · ")}<Message id="theRemainingSamplesCarryAReviewFlagAnd" /></p>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="divinerBolometricBrightnessTemperatureForSouthernLunarSummers" /></p>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="samplesDifferInResolutionTimeOfDayAnd" /></p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={pilotThermal.earth.source} target="_blank" rel="noreferrer"><Message id="modisDataOrnlDaac" /></a>
      {pilotThermal.moon.map(bin => <a key={bin.product} className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={bin.labelUrl} target="_blank" rel="noreferrer"><Message id="divinerLabel" /> {hour(bin.hourStart)}</a>)}
    </div>
  </section>;
}
