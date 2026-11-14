"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { AnalogCandidate } from "@/lib/analog-search";
import type { thermalResult } from "@/lib/catalog-thermal";
import { lunarThermal } from "@/lib/pilot-thermal";
import powerArchive from "@/data/catalog-power-surface.json";

type Modis = ReturnType<typeof thermalResult>;
type Query = { status: "loading" | "unavailable" } | { status: "available"; modis: Modis };
const initial: Query = { status: "loading" };

export default function CandidateTemperature({ site, profileId, archived }: {
  site: AnalogCandidate; profileId: string; archived: boolean;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const [query, setQuery] = useState<Query>(initial);
  const power = powerArchive.sites.find(row => row.id === site.id &&
    Math.abs(row.lat - site.lat) <= 1e-6 && Math.abs(row.lon - site.lon) <= 1e-6);
  const lunar = profileId === "moon-mons-mouton" ? lunarThermal : [];
  const modis = query.status === "available" ? query.modis : null;

  useEffect(() => {
    const controller = new AbortController();
    const url = "/api/analog-search/thermal?" + new URLSearchParams({
      id: String(site.id), archived: archived ? "1" : "0",
    });
    fetch(url, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(26000)]) })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (controller.signal.aborted) return;
        const coords = data?.site;
        const matches = coords?.id === site.id && Math.abs(coords.lat - site.lat) <= 1e-6 &&
          Math.abs(coords.lon - site.lon) <= 1e-6;
        setQuery(matches && data.modis ? { status: "available", modis: data.modis } : { status: "unavailable" });
      })
      .catch(() => { if (!controller.signal.aborted) setQuery({ status: "unavailable" }); });
    return () => controller.abort();
  }, [site.id, site.lat, site.lon, archived]);

  const number = (value: number) => format.number(value, { maximumFractionDigits: 1 });
  const thermal = (stats: { min: number; median: number; max: number } | null) =>
    stats ? [stats.min, stats.median, stats.max].map(number).join(" / ") + " K" : "—";

  return <section className="mt-8 space-y-4 border-t border-slate-300 pt-6" aria-labelledby="temperature-heading">
    <div>
      <h3 id="temperature-heading" className="text-xl font-semibold">{t("surfaceTemperature")}</h3>
      <p className="mt-1 text-sm">{t("thermalContext")}</p>
    </div>
    {power && <div className="border border-slate-200 p-4">
      <h4 className="font-medium">NASA POWER · MERRA-2 TS</h4>
      <p className="mt-1 text-2xl tabular-nums">{number(power.annual)} °C</p>
      <p className="text-xs">{t("thermalPowerCoverage", { year: powerArchive.year })}</p>
      <a className="mt-2 inline-block text-xs underline" href={power.source} target="_blank" rel="noreferrer">{t("thermalOriginalSource")}</a>
    </div>}
    <div className="space-y-2">
      <h4 className="font-medium">MODIS Terra · MOD11A2.061</h4>
      {!modis && <p role="status" className="text-sm">{t(query.status === "loading" ? "thermalLoading" : "thermalModisUnavailable")}</p>}
      {modis && <>
        <p className="text-xs">{t("thermalModisCoverage", { cell: Math.round(modis.cellM) })}</p>
        <div className="overflow-x-auto"><table className="w-full min-w-80 border-collapse text-left text-sm">
          <thead className="bg-slate-50"><tr className="[&_th]:p-2">
            <th scope="col">{t("localTime")}</th><th scope="col">{t("minMedianMax")}</th><th scope="col">{t("thermalValidSamples")}</th>
          </tr></thead>
          <tbody>{modis.phases.map(row => <tr key={row.phase} className="border-b border-slate-200 [&_td]:p-2 [&_th]:p-2">
            <th scope="row">{t(row.phase === "Day" ? "thermalDay" : "thermalNight")}
              {row.observedLocalHours && <small className="block font-normal">{row.observedLocalHours.map(number).join("–")} h</small>}
            </th>
            <td>{thermal(row.statistics)}</td><td>{row.strictCount} / {row.possibleCount}</td>
          </tr>)}</tbody>
        </table></div>
        <a className="text-xs underline" href={modis.source} target="_blank" rel="noreferrer">{t("thermalOriginalSource")}</a>
      </>}
    </div>
    <Link href="/datos#thermal-data" className="inline-block text-sm underline">{t("thermalCatalogTitle")}</Link>
    <div className="border-t border-slate-200 pt-3 text-sm">
      <h4 className="font-medium">{t("thermalPlanetaryReference")}</h4>
      {lunar.length ? <>
        <p className="my-2 text-xs">{t("thermalLunarScale")}</p>
        <ul className="space-y-1">{lunar.map(row => <li key={row.product}>
          <a className="underline" href={row.labelUrl} target="_blank" rel="noreferrer">Diviner · {row.hourStart}–{row.hourEnd} h</a>
          {" · "}{thermal(row.statistics)}
        </li>)}</ul>
      </> : <p className="mt-2">{t("thermalPlanetaryUnavailable")}</p>}
    </div>
  </section>;
}
