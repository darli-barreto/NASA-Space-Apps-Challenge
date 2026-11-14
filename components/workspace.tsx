"use client";
import SourceText from "@/components/source-text";

import { useTranslations } from "next-intl";

import { Message } from "@/components/message";


import { useSavedReports } from "./use-saved-reports";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { workspaceRoutes, workspaceWidth } from "@/lib/workspace-routes";
import MapView from "./map-view";
import { DiscoveryContext } from "./discovery-context";
import CandidateSearchProgress from "./candidate-search-progress";
import SiteProperties from "./site-properties";
import WorkspaceHeader from "./workspace-header";
import WorkspaceFooter from "./workspace-footer";
import { useDiscovery } from "./use-discovery";
import { Analysis, Settings, Site, candidates, checks, dimensions, reportText, validSite } from "@/lib/analysis";


function download(content: string, extension: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: extension === "json" ? "application/json" : "text/markdown;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `terra-${name.replace(/[^a-z0-9]/gi, "-")}.${extension}`; a.click(); URL.revokeObjectURL(url);
}

const fmt = (n: number | null | undefined, digits = 1) => n == null ? "—" : n.toLocaleString("es-PE", { maximumFractionDigits: digits });

export default function Workspace({ children }: { children: React.ReactNode }) {
  const translate = useTranslations();
  const [site, setSite] = useState<Site>(candidates[0]);
  const [settings, setSettings] = useState<Settings>({ target: "Luna", task: "Movilidad robótica", relief: 500, rain: 1 });
  const router = useRouter();
  const pathname = usePathname();
  const tab = Object.entries(workspaceRoutes).find(([, href]) => href === pathname)?.[0];
  const discovery = useDiscovery();
  const [selectedId, selectCandidate] = useState<number>();
  const [result, setResult] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useSavedReports(() => setMessage("El navegador no pudo guardar el historial. Exporta tu ficha para conservarla."));
  const stale = result && JSON.stringify({ site, settings }) !== JSON.stringify({ site: result.site, settings: result.settings });
  async function analyze() {
    if (!validSite(site)) { setMessage("Introduce una ubicación válida y un radio entre 1 y 25 km."); return; }
    setBusy(true); setMessage("");
    try { const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site, settings }), signal: AbortSignal.timeout(55000) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setResult(data); navigate("Resultados"); }
    catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo ejecutar el análisis. Reintenta."); }
    finally { setBusy(false); }
  }
  function save() { if (result) { setSaved(s => [result, ...s.filter(a => a.id !== result.id)].slice(0, 20)); setMessage("Ficha guardada en este navegador. Disponible en Comparar."); } }
  function navigate(nextTab: keyof typeof workspaceRoutes) {
    router.push(workspaceRoutes[nextTab]);
  }
  function inspect(s: Site, body: "Luna" | "Marte") {
    setSite(s);
    setSettings(current => ({ ...current, target: body }));
    navigate("Explorar");
  }
  return <div className={`flex min-h-dvh flex-col ${tab === "Descubrir" ? "lg:h-dvh lg:min-h-[36rem]" : ""}`}>
    <WorkspaceHeader
      tab={tab ?? (pathname.startsWith("/analogos/") ? "Descubrir" : "")}
      searchAction={{
        label: discovery.busy ? translate("pause") : discovery.complete ? translate("complete") : discovery.results.length ? translate("resumeSearch") : translate("findCandidates"),
        disabled: discovery.complete && !discovery.busy,
        onClick: () => {
          if (tab !== "Descubrir") navigate("Descubrir");
          if (discovery.busy) discovery.pause();
          else void discovery.search();
        },
      }}
    />
    <div className={`${pathname.startsWith("/analogos/") ? "w-full" : workspaceWidth} flex min-h-0 min-w-0 flex-1 flex-col md:flex-row`}>
      {tab === "Explorar" && <SiteProperties site={site} settings={settings} busy={busy} setSite={setSite}
        setSettings={setSettings} analyze={analyze} />}
      <main className="flex min-w-0 flex-1 flex-col">
        <div role="status" aria-live="polite">{message && <div className="mx-4 my-3 flex justify-between gap-3 border border-slate-200 bg-white p-3 text-sm"><SourceText value={message} /><button aria-label={translate("dismissNotice")} onClick={() => setMessage("")}>×</button></div>}{busy && <div className="mx-4 my-3 flex justify-between gap-3 border border-slate-200 bg-white p-3 text-sm"><Message id="queryingNasaPowerAnd9SrtmSamplesAllow" /></div>}</div>
        <DiscoveryContext value={{ discovery, inspect, selectedId, selectCandidate, result, saved }}>{children}</DiscoveryContext>
        {tab === "Explorar" && <>
          {result && <div className="px-4 pt-3">
            <button className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" onClick={() => navigate("Resultados")}>{translate("openLastReport")}</button>
          </div>}
          <MapView site={validSite(site) ? site : candidates[0]} setSite={setSite} result={result}/>
        </>}
        {tab === "Resultados" && <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-7">{!result ? <Empty title={<SourceText value="Tu investigación empieza con un lugar" />} text={<SourceText value="Selecciona un área y ejecuta el análisis. Aquí aparecerán las mediciones, fuentes y límites de la evaluación." />}/> : <>
          <button className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black mb-3" onClick={() => navigate("Explorar")}>{translate("backToMap")}</button>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl"><SourceText value={result.site.name} /></h1><p className="my-2 text-sm leading-relaxed text-black">{result.site.lat.toFixed(4)}°, {result.site.lon.toFixed(4)}<Message id="radius2" /> {result.site.radius} km · {new Date(result.created).toLocaleString("es-PE")}</p></div><button className="inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-bold text-black border-[#0042A6] bg-white hover:bg-[#0042A6]/10" onClick={save}>{saved.some(s => s.id === result.id) ? translate("reportSaved") : translate("saveForComparison")}</button></div>
          {stale && <div className="my-3 border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-black"><Message id="settingsChangedRunTheAnalysisAgainToUpdate" /></div>}
          {result.warnings.map(w => <div className="my-3 border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-black" key={w}><SourceText value={w} /></div>)}
          <div className="my-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{[["Temperatura del aire", fmt(result.climate?.temperature), "°C", "Media climatológica · 2 m"], ["Precipitación", fmt(result.climate?.precipitation, 2), "mm/d", "Media climatológica"], ["Viento", fmt(result.climate?.wind), "m/s", "Media climatológica · 10 m"], ["Relieve muestreado", fmt(result.terrain?.relief, 0), "m", `${Math.round((result.terrain?.coverage ?? 0) * 9)}/9 muestras válidas`]].map(([label, value, unit, note]) => <div className="grid gap-2 border border-slate-200 bg-white p-3 text-xs [&>strong]:text-xl [&>strong>small]:ml-1 [&>small]:text-black" key={label}><span><SourceText value={String(label)} /></span><strong>{value}<small>{unit}</small></strong><small><SourceText value={String(note)} /></small></div>)}</div>
          <div className="grid gap-4 lg:grid-cols-2"><section className="mb-4 min-w-0 border border-slate-200 bg-white p-5"><h2 className="my-2 text-lg font-bold tracking-tight"><Message id="monthlyTemperature" /></h2><p className="my-2 text-sm leading-relaxed text-black"><Message id="meanMonthlyAirTemperatureC" /></p><TemperatureChart months={result.climate?.months ?? Array(12).fill(null)}/><p className="my-2 text-xs leading-relaxed text-black"><SourceText value={result.climate?.period ?? "Sin datos climáticos"} /><Message id="monthlyMeansSummarizeTypicalConditions" /></p></section><section className="mb-4 min-w-0 border border-slate-200 bg-white p-5"><h2 className="my-2 text-lg font-bold tracking-tight"><Message id="siteCriteria" /></h2>{checks(result).map(c => <div className="flex justify-between gap-2 border-b border-slate-200 py-3 text-xs" key={c.label}><span>{c.label}</span><b className="text-black"><SourceText value={c.value === null ? "Sin evaluar" : c.value ? "Cumple" : "No cumple"} /></b></div>)}<p className="my-2 text-xs leading-relaxed text-black"><Message id="meetingTheseThresholdsPrioritizesFurtherResearchLandingMobility" /></p></section></div>
          <details className="mb-4 min-w-0 border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold"><Message id="evidenceCoverage" /></summary><div className="grid gap-x-4 lg:grid-cols-2">{dimensions.map(([n, title, text], i) => <div className="border-b border-slate-200 py-3 text-xs [&>span]:hidden [&_h3]:font-medium [&_small]:ml-2 [&_p]:mt-1 [&_p]:text-black" key={n}><span>{n}</span><div><h3>{title}<small>{i === 0 ? result.terrain?.coverage ? "Parcial" : "Sin datos" : i === 1 ? result.climate ? "Parcial" : "Sin datos" : "Por investigar"}</small></h3><p className="my-2 text-sm leading-relaxed text-black">{text}</p></div></div>)}</div></details>
          <details className="mb-4 min-w-0 border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold"><Message id="interpretationAndLimitations" /></summary><p className="my-2 text-sm leading-relaxed text-black"><Message id="theseObservationsHelpPrepareAnInspectionFor" /> <strong>{result.settings.task.toLowerCase()}</strong><Message id="demonstratingUsefulnessAsAnAnalogFor" /> {result.settings.target}<Message id="requiresASpecificPlanetaryRegionDataAtA" /></p><p className="my-2 text-sm leading-relaxed text-black"><Message id="gravityLunarVacuumTheThinMartianAtmosphereAnd" /></p></details>
          <details className="mb-4 min-w-0 border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold"><Message id="sourcesAndExport" /></summary><p className="my-2 text-sm leading-relaxed text-black">POWER: <SourceText value={result.climate?.resolution ?? "No disponible"} /> <Message id="nasaNgaSrtmViaOpenTopoDataAn" /></p>{result.climate && <a href={result.climate.source} target="_blank" rel="noreferrer"><Message id="openOriginalNasaPowerResponse" /></a>}{result.terrain && <a href={result.terrain.source} target="_blank" rel="noreferrer"><Message id="openSrtmResponseOpenTopoData" /></a>}<div className="mt-4 flex flex-wrap items-center gap-3"><button className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-100" onClick={() => download(reportText(result), "md", result.site.name)}> <Message id="markdownReport" /></button><button className="inline-flex items-center gap-2 rounded-sm border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-100" onClick={() => download(JSON.stringify(result, null, 2), "json", result.site.name)}><Message id="jsonData" /></button></div></details>
        </>}</div>}
        {tab === "Comparar" && <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-7"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{translate("reportComparison")}</h1></div></div>{saved.length === 0 ? <Empty title={<SourceText value="Aún no hay fichas guardadas" />} text={<SourceText value="Analiza un lugar y pulsa Guardar para comparar. Puedes estudiar varios sitios o el mismo sitio con otros criterios." />}/> : <><div className="my-3 border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-black"><Message id="checkScalesPeriodsAndCriteriaBeforeInterpretingDifferences" /></div><div className="overflow-auto border border-slate-200 bg-white [&_table]:w-full [&_td]:min-w-32 [&_td]:p-3 [&_th]:min-w-32 [&_th]:bg-sky-50 [&_th]:p-3 [&_th]:text-left [&_tr]:border-b [&_tr]:border-slate-200 [&_small]:block"><table><thead><tr><th><Message id="observation" /></th>{saved.map(a => <th key={a.id}>{a.site.name}<small><SourceText value={a.settings.target} /> · {a.site.radius} km</small></th>)}</tr></thead><tbody>{[["Temperatura · °C", (a: Analysis) => fmt(a.climate?.temperature)], ["Precipitación · mm/d", (a: Analysis) => fmt(a.climate?.precipitation, 2)], ["Viento · m/s", (a: Analysis) => fmt(a.climate?.wind)], ["Relieve muestreado · m", (a: Analysis) => fmt(a.terrain?.relief, 0)], ["Muestras SRTM válidas", (a: Analysis) => `${Math.round((a.terrain?.coverage ?? 0) * 100)}%`], ["Relieve máximo configurado", (a: Analysis) => `${a.settings.relief} m`], ["Lluvia máxima configurada", (a: Analysis) => `${a.settings.rain} mm/d`], ["Aplicación", (a: Analysis) => a.settings.task], ["Período climático", (a: Analysis) => a.climate?.period ?? "Sin datos"]].map(([label, value]) => <tr key={String(label)}><td><SourceText value={String(label)} /></td>{saved.map(a => <td key={a.id}><SourceText value={(value as (a: Analysis) => string)(a)} /></td>)}</tr>)}<tr><td><Message id="report" /></td>{saved.map(a => <td key={a.id}><button className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" onClick={() => { setResult(a); navigate("Resultados"); }}><Message id="open" /></button><button className="text-xs font-medium text-black underline decoration-[#0042A6] underline-offset-2 hover:decoration-black" onClick={() => setSaved(s => s.filter(b => b.id !== a.id))}><Message id="remove" /></button></td>)}</tr></tbody></table></div></>}</div>}
      </main>
    </div>
    {tab !== "Descubrir" && <WorkspaceFooter />}
    {discovery.busy && <CandidateSearchProgress processed={discovery.results.length} total={discovery.eligible.length} pause={discovery.pause} />}
  </div>;
}
function Empty({ title, text }: { title: React.ReactNode; text: React.ReactNode }) { return <div className="grid min-h-72 content-center gap-3 border border-slate-200 bg-white p-8 text-center"><h2 className="my-2 text-lg font-bold tracking-tight">{title}</h2><p className="my-2 text-sm leading-relaxed text-black">{text}</p></div>; }

function TemperatureChart({ months }: { months: (number | null)[] }) {
  const values = months.filter((v): v is number => v !== null);
  if (!values.length) return <div className="p-6 text-center text-xs text-black"><Message id="monthlyDataUnavailable" /></div>;
  const min = Math.floor(Math.min(...values) - 1), max = Math.ceil(Math.max(...values) + 1);
  const x = (i: number) => 45 + i * 35;
  const y = (v: number) => 145 - (v - min) / (max - min) * 115;
  return <svg className="mt-3 max-h-52 w-full" viewBox="0 0 460 185" role="img" aria-label={`Temperatura media mensual: ${months.map((v, i) => `${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][i]} ${v === null ? "sin datos" : v + " °C"}`).join(", ")}`}>
    {[min, (min + max) / 2, max].map(v => <g key={v}><line x1="35" x2="445" y1={y(v)} y2={y(v)} stroke="#dce1e6" strokeDasharray="3 4"/><text x="3" y={y(v) + 3} fill="#000" fontSize="9">{fmt(v)}°</text></g>)}
    {months.map((v, i) => <g key={i}>{v !== null && <>{i > 0 && months[i - 1] !== null && <line x1={x(i - 1)} x2={x(i)} y1={y(months[i - 1]!)} y2={y(v)} stroke="#287bb7" strokeWidth="2"/>}<circle cx={x(i)} cy={y(v)} r="3" fill="#287bb7"/><text x={x(i)} y={y(v) - 11} textAnchor="middle" fill="#000" fontSize="9">{fmt(v)}</text></>}<text x={x(i)} y="173" textAnchor="middle" fill="#000" fontSize="9">{["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</text></g>)}
  </svg>;
}
