"use client";
import { useSourceText } from "./source-text";

import { Message } from "@/components/message";


import Link from "next/link";
import { candidateName, workspaceRoutes } from "@/lib/workspace-routes";
import { useDiscoveryContext } from "./discovery-context";
import DataSamples, { measure } from "./data-samples";
import DataTable from "./data-table";

export default function SessionAnalysisData() {
  const sourceText = useSourceText();
  const { discovery, result, saved } = useDiscoveryContext();
  const inspections = result ? [result, ...saved.filter(item => item.id !== result.id)] : saved;
  const inspectionName = (item: (typeof inspections)[number]) => `${item.site.name} · ${item.created.slice(0, 10)}`;

  function exportInspections() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(inspections, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "terra-inspecciones.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold"><Message id="currentSearch" /></h2>
        {discovery.results.length ? (
          <>
            <p className="text-sm"><Message id="reference" /> {sourceText(discovery.profile.name)} · {discovery.results.length} de {discovery.eligible.length} <Message id="processed2" /></p>
            <DataTable title="Ranking de esta sesión" columns={["Candidato", "Relieve (m)", "P90 (°)", "Aporte del relieve", "Aporte del P90", "Distancia"]}
              rows={discovery.ranked.map(row => [candidateName(row.id), measure(row.signature?.reliefM), measure(row.signature?.p90GradientDeg),
                measure(row.score.metrics[0].contribution), measure(row.score.metrics[1].contribution), measure(row.distance)])} />
            <DataSamples title="Elevaciones de esta búsqueda" groups={discovery.results.map(row => ({ label: candidateName(row.id), samples: row.samples }))} />
            <button type="button" onClick={discovery.download} className="text-sm text-[#0042A6] underline underline-offset-2"><Message id="exportSearchJson" /></button>
          </>
        ) : <Link href={workspaceRoutes.Descubrir} className="text-sm text-[#0042A6] underline"><Message id="goToCandidateSearch" /></Link>}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold"><Message id="browserInspectionReports" /></h2>
        {inspections.length ? (
          <>
            <DataTable title="Clima y relieve de las inspecciones" columns={["Sitio", "Radio (km)", "Aire (°C)", "Lluvia (mm/día)", "Viento (m/s)", "Relieve (m)", "Período"]}
              rows={inspections.map(item => [inspectionName(item), measure(item.site.radius), measure(item.climate?.temperature),
                measure(item.climate?.precipitation), measure(item.climate?.wind), measure(item.terrain?.relief), item.climate?.period ?? "Sin dato"])} />
            <DataTable title="Temperatura mensual de las inspecciones" columns={["Sitio", "Mes", "Aire (°C)"]}
              rows={inspections.flatMap(item => (item.climate?.months ?? []).map((value, index) => [inspectionName(item), index + 1, measure(value)]))} />
            <DataSamples title="Elevaciones de las inspecciones" groups={inspections.flatMap(item => item.terrain ? [{ label: inspectionName(item), samples: item.terrain.samples }] : [])} />
            <button type="button" onClick={exportInspections} className="text-sm text-[#0042A6] underline underline-offset-2"><Message id="exportInspectionsJson" /></button>
          </>
        ) : <Link href={workspaceRoutes.Explorar} className="text-sm text-[#0042A6] underline"><Message id="openTheMapToInspectASite" /></Link>}
      </section>
    </>
  );
}
