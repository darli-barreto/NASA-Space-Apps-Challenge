import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import type { Metadata } from "next";
import Link from "next/link";
import { planetaryProfiles } from "@/lib/planetary";
import srtm from "@/data/contrast-validation.json";
import controls from "@/data/terrain-controls.json";
import { terrainDistanceBreakdown } from "@/lib/analog-math";
import { mobilityProfile } from "@/lib/mobility-assessment";
import { candidateName, workspaceRoutes } from "@/lib/workspace-routes";
import DataSamples from "@/components/data-samples";
import DataTable from "@/components/data-table";
import ProjectDataArchive from "@/components/project-data-archive";
import PilotDataValues from "@/components/pilot-data-values";
import SessionAnalysisData from "@/components/session-analysis-data";
import { challengeResources, challengeResourcesUrl, nasaSources, partnerSources, type ResearchSource } from "@/lib/research-sources";

export const metadata: Metadata = { title: "Datos y fuentes · TERRA" };

function SourceTable({ title, sources }: { title: string; sources: ResearchSource[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold"><SourceText value={title} /></h2>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table aria-label={title} className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5">
          <thead className="bg-slate-100"><tr><th scope="col"><Message id="source" /></th><th scope="col"><Message id="use" /></th><th scope="col"><Message id="contribution" /></th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {sources.map(({ name, href, use, detail }) => (
              <tr key={name} className="align-top">
                <th scope="row" className="font-medium"><a href={href} target="_blank" rel="noreferrer" className="text-[#0042A6] underline underline-offset-2"><SourceText value={name} /></a></th>
                <td><SourceText value={use} /></td><td><SourceText value={detail} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const format = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

export default function DataPage() {
  const reference = planetaryProfiles[0].signature;
  const weights = terrainDistanceBreakdown(reference, reference)?.metrics ?? [];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-6 sm:py-9">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight"><Message id="dataAndSources" /></h1>
        <p><Message id="theRankingCombinesSrtmLandElevationsWithNasa" /></p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#0042A6] underline underline-offset-4">
          <a href="/api/datos/archivo" download><Message id="downloadDataArchiveJson" /></a>
          <Link href={workspaceRoutes.Metodología}><Message id="analysisMethodology" /></Link>
          <a href={challengeResourcesUrl} target="_blank" rel="noreferrer"><Message id="officialChallengeResources" /></a>
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold"><Message id="rankingReferences" /></h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table aria-label="Referencias del ranking" className="w-full text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5">
            <thead className="bg-slate-100"><tr><th scope="col"><Message id="reference" /></th><th scope="col"><Message id="product" /></th><th scope="col"><Message id="relief" /></th><th scope="col"><Message id="p90Gradient" /></th></tr></thead>
            <tbody className="divide-y divide-slate-200">
              {planetaryProfiles.map(profile => (
                <tr key={profile.id}>
                  <th scope="row" className="font-medium"><SourceText value={profile.body} /> · <SourceText value={profile.name} /></th>
                  <td><a href={profile.labelUrl} target="_blank" rel="noreferrer" className="text-[#0042A6] underline">{profile.product}</a></td>
                  <td>{format.format(profile.signature.reliefM)} m</td><td>{format.format(profile.signature.p90GradientDeg)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold"><Message id="elevationData" /></h2>
        <DataSamples title="Nodos planetarios" groups={planetaryProfiles.map(profile => ({ label: profile.name, samples: profile.samples }))} />
        <DataSamples title="Nodos SRTM archivados de candidatos" groups={srtm.flatMap(batch => batch.results.map(row => ({ label: candidateName(row.id), samples: row.samples })))} />
        <DataSamples title="Nodos SRTM de los controles" groups={controls.controls.map(control => ({ label: control.name, samples: control.samples }))} />
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold"><Message id="analysisWeights" /></h2>
        <DataTable title="Pesos del ranking y del terreno para movilidad" columns={["Variable", "Unidad", "Ranking", "Terreno para movilidad"]}
          rows={mobilityProfile.terrainVariables.map(variable => {
            const rankingId = variable.id === "relief" ? "reliefM" : variable.id === "highGradient" ? "p90GradientDeg" : null;
            const weight = weights.find(metric => metric.id === rankingId)?.weight ?? 0;
            return [variable.label, variable.unit, `${weight * 100} %`, `${variable.weight} %`];
          })} />
      </section>
      <SessionAnalysisData />
      <PilotDataValues />
      <ProjectDataArchive />
      <SourceTable title="Fuentes NASA integradas" sources={nasaSources} />
      <SourceTable title="Otras fuentes integradas" sources={partnerSources} />
      <SourceTable title="Recursos recomendados por el reto" sources={challengeResources} />
    </div>
  );
}
