import { Message } from "@/components/message";
import type { ElevationPoint } from "@/lib/analog-math";
import { terrainGrids } from "@/lib/terrain-grid";

type Site = {
  label: string;
  sourceName: string;
  sourceUrl: string;
  samples: readonly ElevationPoint[];
};

const metres = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });
const coordinates = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 5 });
const light = "#f8f8f8";
const dark = "#a6a6a6";

export default function TerrainGridComparison({ earth, planet, spacingKm }: {
  earth: Site;
  planet: Site;
  spacingKm: number;
}) {
  const sites = [earth, planet];
  const { grids, maximumM } = terrainGrids(sites.map(site => site.samples));

  return (
    <figure className="my-4 border-y border-slate-200 py-3">
      <figcaption className="mb-2 text-sm font-semibold"><Message id="visualTerrainComparison" /></figcaption>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {sites.map((site, index) => {
          const cells = grids[index];
          return (
            <section className="min-w-0 border border-slate-200 p-2 sm:p-3" key={site.label}>
              <h3 className="text-xs font-semibold sm:text-sm">{site.label}</h3>
              <div className="my-2 flex justify-between text-xs"><span><Message id="northUp" /></span><span>{metres.format(spacingKm * 2)} × {metres.format(spacingKm * 2)} km</span></div>
              {cells ? (
                <table className="w-full table-fixed border-separate border-spacing-0.5 text-center text-xs tabular-nums" aria-label={`Elevaciones relativas de ${site.label}, en metros`}>
                  <tbody>
                    {[0, 3, 6].map(start => (
                      <tr key={start}>
                        {cells.slice(start, start + 3).map((cell, column) => {
                          const center = start === 3 && column === 1;
                          const weight = maximumM > 0 && cell.relativeM !== null ? cell.relativeM / maximumM : 0;
                          return (
                            <td
                              key={column}
                              className={`h-9 border text-black ${center ? "border-black font-semibold" : "border-slate-200"}`}
                              style={{ backgroundColor: `color-mix(in srgb, ${dark} ${weight * 100}%, ${light})` }}
                              title={`${center ? "Centro · " : ""}${coordinates.format(cell.lat)}°, ${coordinates.format(cell.lon)}° · ${cell.elevation === null || !Number.isFinite(cell.elevation) ? "Sin dato" : `${metres.format(cell.elevation)} m de elevación original`}`}
                            >
                              {center && <span className="sr-only"><Message id="center" /> </span>}
                              {cell.relativeM === null ? <abbr className="no-underline" title="Sin dato">—</abbr> : metres.format(cell.relativeM)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="my-2 text-xs leading-relaxed text-black"><Message id="noSamplesAvailable" /></p>}
              <a className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" href={site.sourceUrl} target="_blank" rel="noreferrer">{site.sourceName}</a>
            </section>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span>0 m</span>
        <span aria-hidden="true" className="h-2 w-20 border border-slate-200" style={{ background: `linear-gradient(to right, ${light}, ${maximumM > 0 ? dark : light})` }} />
        <span>{metres.format(maximumM)} m</span>
        <span><Message id="heightAboveEachSiteSMinimum" /></span>
      </div>
      <p className="my-2 text-xs leading-relaxed text-black"><Message id="nineSamplesPerSiteEvery" /> {metres.format(spacingKm)} <Message id="kmTheBoxMarksTheCenter" /></p>
    </figure>
  );
}
