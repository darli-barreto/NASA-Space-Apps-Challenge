"use client";
import { useTranslations } from "next-intl";

import { useState } from "react";
import type { candidateArea } from "@/lib/catalog-area-terrain";
import { useLanguage } from "./display-preferences";
import TerrainMetricTable, { terrainNumber } from "./terrain-metric-table";

export default function TerrainAreaPanel({ area }: { area?: ReturnType<typeof candidateArea> }) {
  const [scaleIndex, setScaleIndex] = useState(0);
  const { t } = useLanguage();
  const translate = useTranslations();
  if (!area) return null;

  const disagreement = area.disagreement?.[scaleIndex];
  return <section className="mt-8 border-t border-slate-300 pt-6" aria-labelledby="area-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 id="area-heading" className="mt-1 text-xl font-semibold">{translate("fullAreaComparison")}</h3></div>
      <div className="flex gap-2" aria-label={translate("averagingCellSize")}>
        {[500,1000].map((step,i) => <button key={step} aria-pressed={scaleIndex===i} onClick={()=>setScaleIndex(i)}
          className="rounded-sm border border-slate-300 px-3 py-2 text-xs aria-pressed:border-black aria-pressed:bg-slate-100">{translate("cellsOf")} {step} m</button>)}
      </div>
    </div>
    <p className="my-3 max-w-3xl text-sm">{translate("44KmWindowEachCellAveragesAll")}</p>
    <div className={`my-5 grid gap-3 ${area.products.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {area.products.map(p => <div className="border border-slate-200 p-4" key={p.name}>
        <p className="text-sm font-medium">{p.name}</p>
        <p className="mt-2 text-2xl tabular-nums">{p.scales[scaleIndex].completeCells}<span className="text-base"> / {p.scales[scaleIndex].totalCells}</span></p>
        <p className="mt-1 text-xs">{translate("cellsWithCompleteValidCoverage")}</p>
        <p className="mt-3 text-xs">{p.quality.maskSource ? translate("aw3d30QualityMaskMsk0Only") : translate("nodataCheckedPerPixelAccuracyUnavailable")}</p>
      </div>)}
    </div>
    <TerrainMetricTable series={area.products.map(p=>({name:p.name,metrics:p.scales[scaleIndex].metrics}))}/>
    <div className="mt-5 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2">
      {disagreement && <div><h4 className="text-sm font-medium">{translate("differenceBetweenEarthModels")}</h4>
        <p className="mt-2 text-2xl tabular-nums">{terrainNumber(disagreement.centeredRmseM)} m <span className="text-xs">{translate("centeredRmse")}</span></p>
        <p className="mt-2 text-xs">{t(`GLO-30 frente a AW3D30 · ${disagreement.pairedCells} pares. Desplazamiento medio retirado: ${terrainNumber(disagreement.meanOffsetM)} m.`, `GLO-30 versus AW3D30 · ${disagreement.pairedCells} pairs. Mean offset removed: ${terrainNumber(disagreement.meanOffsetM)} m.`)}</p></div>}
      <div><h4 className="text-sm font-medium">{translate("absoluteUncertainty")}</h4><p className="mt-2 text-lg">{translate("undetermined")}</p>
        <p className="mt-2 text-xs">{translate("verticalAccuracyRequiresPerPixelErrorEstimatesAnd")}</p></div>
    </div>
    <p className="mt-3 text-xs">{translate("theModelsUseEqualNominalCellSizesAnd")}</p>
    <div className="mt-3 flex flex-wrap gap-4 text-xs">{area.products.map(p=><a className="underline" href={p.source} target="_blank" rel="noreferrer" key={p.name}>{p.name} · {translate("source2")}</a>)}</div>
  </section>;
}
