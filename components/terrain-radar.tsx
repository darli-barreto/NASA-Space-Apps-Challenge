import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import type { assessMobility } from "@/lib/mobility-assessment";

const labels = ["Relieve", "Gradiente P90", "Gradiente mediano", "Desviación"];
const point = (i: number, scale: number) => {
  const angle = i * Math.PI / 2;
  return `${150 + Math.sin(angle) * 66 * scale},${89 - Math.cos(angle) * 66 * scale}`;
};

export default function TerrainRadar({ variables, body }: {
  variables: ReturnType<typeof assessMobility>["variables"];
  body: string;
}) {
  if (variables.length !== labels.length) return null;
  const polygon = (field: "earth" | "reference") => variables.map((v, i) =>
    point(i, Math.max(v.earth, v.reference) > 0 ? v[field] / Math.max(v.earth, v.reference) : 0)).join(" ");
  return (
    <figure className="my-3 border border-slate-200 p-2">
      <figcaption className="text-sm font-semibold"><Message id="terrainProfile" /></figcaption>
      <svg viewBox="-15 0 330 180" className="mx-auto block w-full max-w-md fill-current text-slate-900 [[data-dark]_&]:text-slate-100" role="img" aria-label={`Radar topográfico de Tierra y ${body}. Valores exactos en la tabla siguiente.`}>
        {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={labels.map((_, i) => point(i, scale)).join(" ")} fill="none" className="stroke-slate-300 [[data-dark]_&]:stroke-slate-600" />)}
        {labels.map((label, i) => {
          const [x,y] = point(i, 1).split(",");
          return <g key={label}><line x1="150" y1="89" x2={x} y2={y} className="stroke-slate-300 [[data-dark]_&]:stroke-slate-600" />
            <text x={[150, 221, 150, 79][i]} y={[16, 93, 171, 93][i]} textAnchor={(["middle", "start", "middle", "end"] as const)[i]} fontSize="10"><SourceText value={label} /></text>
          </g>;
        })}
        <polygon points={polygon("earth")} fillOpacity=".13" strokeWidth="2" className="fill-[#0042a6] stroke-[#0042a6] [[data-dark]_&]:fill-sky-400 [[data-dark]_&]:stroke-sky-400" />
        <polygon points={polygon("reference")} strokeWidth="2" className="fill-none stroke-slate-900 [[data-dark]_&]:stroke-slate-100" strokeDasharray="5 3" />
      </svg>
      <p className="text-center text-xs"><Message id="blueLineEarthDashedLine" /> <SourceText value={body} /></p>
      <p className="mt-1 text-center text-xs"><Message id="eachAxisRunsFromZeroToTheLarger" /></p>
    </figure>
  );
}
