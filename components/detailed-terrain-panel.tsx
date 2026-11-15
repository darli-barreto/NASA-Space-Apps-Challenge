"use client";
import { useTranslations } from "next-intl";

import { useLanguage } from "./display-preferences";

import { useState } from "react";
import type { DetailedTerrain } from "@/lib/detailed-terrain";
import type { AnalogCandidate } from "@/lib/analog-search";
import TerrainMetricTable from "./terrain-metric-table";
import { useCandidateTerrain } from "./use-candidate-terrain";

export default function DetailedTerrainPanel({site,profileId,body,initial}:{
  site:AnalogCandidate;profileId:string;body:string;initial?:DetailedTerrain;
}) {
  const { t } = useLanguage();
  const translate = useTranslations();
  const {data,error,retry}=useCandidateTerrain(site,profileId,initial);
  const bodyName = t(body, body === "Luna" ? "Moon" : "Mars");
  const [scale,setScale]=useState(0);
  function download() {
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download=`terra-detalle-${profileId}-${site.id}.json`;a.click();URL.revokeObjectURL(url);
  }
  return <section className="mt-8 border-t border-slate-300 pt-6" aria-labelledby="dense-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs">{translate("pointSampling44Km")}</p><h3 id="dense-heading" className="mt-1 text-xl font-semibold">{translate("terrainDetail")}</h3></div>
      <div className="flex gap-2" aria-label={translate("sampleSpacing")}>
        {[500,1000,2000].map((step,i)=><button key={step} aria-pressed={scale===i} onClick={()=>setScale(i)}
          className="rounded-sm border border-slate-300 px-3 py-2 text-xs aria-pressed:border-black aria-pressed:bg-slate-100 aria-pressed:font-semibold [[data-dark]_&]:aria-pressed:border-sky-300 [[data-dark]_&]:aria-pressed:bg-slate-700 [[data-dark]_&]:aria-pressed:text-white">{step} m</button>)}
      </div>
    </div>
    {!data && !error && <p className="my-5 text-sm" role="status">{translate("loading81ElevationsPerSite")}</p>}
    {(error || data?.status==="unavailable") && <div role="status" className="my-4 text-sm">
      <p>{translate("detailedElevationsCouldNotBeLoaded")}</p><button onClick={retry} className="mt-2 underline">{translate("retry")}</button></div>}
    {data?.comparison && <>
      <dl className="my-5 grid grid-cols-2 gap-3 border-y border-slate-200 py-4">
        <div><dt className="text-xs">{translate("earthValidSamples")}</dt><dd className="mt-1 text-2xl tabular-nums">{data.comparison.earth.valid} / 81</dd></div>
        <div><dt className="text-xs">{bodyName} · {translate("validSamples")}</dt><dd className="mt-1 text-2xl tabular-nums">{data.comparison.reference.valid} / 81</dd></div>
      </dl>
      <TerrainMetricTable series={[{name:translate("earthSrtm"),metrics:data.comparison.earth.scales[scale].metrics},
        {name:bodyName,metrics:data.comparison.reference.scales[scale].metrics}]}/>
      <p className="mt-3 text-xs">{data.comparison.earth.scales[scale].side ** 2} {translate("pointsPerSiteGradientsAreCalculatedBetweenSample")}</p>
      <p className="mt-2 text-xs">{translate("nominalNativeResolutionEarth")} ≈{Math.round(data.provenance.earthNativeM)} m · {bodyName} ≈{Math.round(data.provenance.referenceNativeM)} m. {translate("interpolationDoesNotAddRealDetail")}</p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <a href={data.provenance.earthSource} target="_blank" rel="noreferrer" className="underline">{translate("earthDataSource")}</a>
        <a href={data.provenance.referenceSource} target="_blank" rel="noreferrer" className="underline">{translate("planetaryDataSource")}</a>
        <button className="underline" onClick={download}>{translate("exportTerrainDetail")}</button>
        <span>{data.archived ? translate("archivedObservations") : translate("queryCachedForUpTo24Hours")}</span>
      </div>
    </>}
  </section>;
}
