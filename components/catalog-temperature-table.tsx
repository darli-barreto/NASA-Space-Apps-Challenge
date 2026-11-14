"use client";

import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import archive from "@/data/catalog-power-surface.json";
import { candidateHref, candidateName } from "@/lib/workspace-routes";
import { defaultPlanetaryProfile } from "@/lib/planetary";

export default function CatalogTemperatureTable() {
  const t = useTranslations();
  const format = useFormatter();

  return <section id="thermal-data" aria-labelledby="thermal-data-heading" className="scroll-mt-40 space-y-3">
    <h2 id="thermal-data-heading" className="text-xl font-semibold">{t("thermalCatalogTitle")}</h2>
    <p className="text-sm">{t("thermalPowerCoverage", { year: archive.year })} · NASA POWER / MERRA-2 TS</p>
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <table className="w-full text-left text-sm tabular-nums [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
        <thead className="bg-slate-50"><tr>
          <th scope="col">{t("candidate")}</th>
          <th scope="col">{t("thermalAnnualMean")} (°C)</th>
          <th scope="col">{t("thermalOriginalSource")}</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-200">{archive.sites.map(site => <tr key={site.id}>
          <th scope="row"><Link href={candidateHref(defaultPlanetaryProfile, site.id)} className="underline">{candidateName(site.id)}</Link></th>
          <td>{format.number(site.annual, { maximumFractionDigits: 2 })}</td>
          <td><a href={site.source} target="_blank" rel="noreferrer" className="underline">NASA POWER</a></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
