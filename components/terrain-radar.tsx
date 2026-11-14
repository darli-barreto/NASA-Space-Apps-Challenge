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
      <svg viewBox="-15 0 330 180" className="mx-auto block w-full max-w-md" role="img" aria-label={`Radar topográfico de Tierra y ${body}. Valores exactos en la tabla siguiente.`}>
        {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={labels.map((_, i) => point(i, scale)).join(" ")} fill="none" stroke="#cbd5e1" />)}
        {labels.map((label, i) => {
          const [x,y] = point(i, 1).split(",");
          return <g key={label}><line x1="150" y1="89" x2={x} y2={y} stroke="#cbd5e1" />
            <text x={[150, 221, 150, 79][i]} y={[16, 93, 171, 93][i]} textAnchor={(["middle", "start", "middle", "end"] as const)[i]} fontSize="10"><SourceText value={label} /></text>
          </g>;
        })}
        <polygon points={polygon("earth")} fill="#0042a6" fillOpacity=".13" stroke="#0042a6" strokeWidth="2" />
        <polygon points={polygon("reference")} fill="none" stroke="#111827" strokeWidth="2" strokeDasharray="5 3" />
      </svg>
      <p className="text-center text-xs"><Message id="blueLineEarthDashedLine" /> <SourceText value={body} /></p>
      <p className="mt-1 text-center text-xs"><Message id="eachAxisRunsFromZeroToTheLarger" /></p>
    </figure>
  );
}
