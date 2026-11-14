import { Message } from "@/components/message";
import lend from "@/data/pilot-lend.json";

const fmt = (value: number | null) =>
  value === null ? "Sin datos" : value.toLocaleString("es-PE", { maximumFractionDigits: 4 });

export default function LendEvidence() {
  const center = lend.cells.filter(cell => lend.centerRecords.includes(cell.record));
  return <section className="mt-4 border-t border-slate-200 pt-3">
    <h3 className="text-sm font-semibold"><Message id="lendRegionalNeutronCounts" /></h3>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="cellsContainingTheCenterOfMonsMoutonBoth" /></p>
    <div className="overflow-x-auto">
      <table className="my-3 w-full table-fixed border-collapse text-xs [&_td]:p-2 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_tr]:border-b [&_tr]:border-slate-200">
        <thead><tr><th scope="col"><Message id="cellCenter" /></th><th scope="col"><Message id="rateCountsS" /></th><th scope="col"><Message id="statisticalError" /></th><th scope="col"><Message id="exposureS" /></th></tr></thead>
        <tbody>{center.map(cell => <tr key={cell.record}>
          <th scope="row">{fmt(cell.lat)}°, {fmt(cell.lon)}° E</th>
          <td>{fmt(cell.rate)}</td><td>{fmt(cell.error)}</td><td>{fmt(cell.exposureS)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="my-2 text-xs leading-relaxed text-black"><Message id="productPeriod" /> {center[0].start.slice(0, 10)} a {center[0].end.slice(0, 10)}<Message id="theExportAlsoPreservesNeighboringCellsThisIndicator" /></p>
    <p className="my-2 text-xs leading-relaxed text-black">{lend.detector} <Message id="0505GridAbout15Km" /></p>
    <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={lend.labelUrl} target="_blank" rel="noreferrer"><Message id="nasaPdsMetadata" /> {lend.product}</a>
  </section>;
}
