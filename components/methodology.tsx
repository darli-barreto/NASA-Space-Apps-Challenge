import SourceText from "@/components/source-text";
import { Message } from "@/components/message";
import Link from "next/link";
import { workspaceRoutes } from "@/lib/workspace-routes";
import { scientificLimits } from "@/lib/planetary";
import { Card, Heading } from "./primitives";
import TerrainControls from "./terrain-controls";

export default function Methodology() {
  return <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-7 max-w-4xl">
    <Heading title={<SourceText value="Método y fuentes" />} description={<SourceText value="Búsqueda de candidatos terrestres y trazabilidad de la evidencia." />} />
    <a className="mb-4 inline-block text-sm underline underline-offset-2" href="/informe-metodologico.md" download><Message id="downloadMethodologyReport" /></a>
    <TerrainControls />
    <Card>
      <h2 className="my-2 text-lg font-bold tracking-tight"><Message id="howCandidatesAreRanked" /></h2>
      <p className="my-2 text-sm leading-relaxed text-black"><Message id="theIngemmetCatalogLimitsTheSearchToVolcanic" /></p>
      <p className="my-2 text-sm leading-relaxed text-black"><Message id="monsMoutonIsAPolarTopographicReferenceHadley" /></p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium"><Message id="limitationsAndPendingChecks" /></summary>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-black">{scientificLimits.map(limit => <li key={limit}><SourceText value={limit} /></li>)}</ul>
      </details>
    </Card>
    <Link href={workspaceRoutes.Datos} className="text-sm underline underline-offset-4"><Message id="seeDataAndSources" /></Link>
  </div>;
}
