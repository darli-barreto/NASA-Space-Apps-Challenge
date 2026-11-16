"use client";
import { useSourceText } from "./source-text";

import { useTranslations } from "next-intl";

import { Message } from "@/components/message";

import { useLanguage } from "./display-preferences";


import { useId, useState } from "react";
import { planetaryProfiles } from "@/lib/planetary";
import { planetaryViewer } from "@/lib/comparison-imagery";
import CandidateList from "./candidate-list";
import CandidatePreview from "./candidate-preview";
import ComparisonPhoto from "./comparison-photo";
import PeruOverview from "./peru-overview";
import { useDiscoveryContext } from "./discovery-context";
import { primaryActionClass } from "./primitives";

const previewWidth = "mx-auto w-full max-w-sm min-w-0 lg:max-w-[max(5rem,calc(100cqh-10.75rem))]";
const rankingWeights = [
  { id: "relief", label: "reliefWeight", explanation: "reliefWeightHint" },
  { id: "gradient", label: "gradientWeight", explanation: "gradientWeightHint" },
] as const;

// Keyed by the search id so "New search" also clears local view state.
export default function Discovery() {
  const { discovery } = useDiscoveryContext();
  return <DiscoveryPanel key={discovery.searchId} />;
}

function DiscoveryPanel() {
  const sourceText = useSourceText();
  const { t } = useLanguage();
  const translate = useTranslations();
  const { discovery: d, selectedId, selectCandidate } = useDiscoveryContext();
  const [showOverview, setShowOverview] = useState(false);
  const weightHintId = useId();
  const catalog = d.catalog;
  const entries = catalog ? d.ranked.flatMap(row => {
    const site = catalog.candidates.find(candidate => candidate.id === row.id);
    return site ? [{ site, distance: row.distance }] : [];
  }) : [];
  const selected = entries.find(entry => entry.site.id === selectedId) ?? entries[0];
  const preview = showOverview ? undefined : selected;
  const { profile } = d;
  const spacingKm = profile.signature.spacingKm;
  const body = profile.body === "Luna" ? "moon" : "mars";
  const viewer = planetaryViewer(body, profile.center, profile.radiusKm, spacingKm);

  return (
    <div className="flex w-full flex-col gap-3 py-3 lg:min-h-0 lg:flex-1 lg:py-4">
      <section className="flex shrink-0 flex-col gap-3 rounded border border-[#8d9297] bg-white p-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-4">
        <label className="block w-full min-w-0 text-sm font-semibold sm:max-w-lg">
          {translate("planetaryReference")}
          <select className="mt-1 block w-full rounded border border-slate-300 p-2 text-sm font-normal"
            disabled={d.busy || d.complete} aria-readonly={d.complete || undefined} value={d.profileId} onChange={event => d.setProfileId(event.target.value)}>
            {planetaryProfiles.map(p => <option key={p.id} value={p.id}>{t(p.body, p.body === "Luna" ? "Moon" : "Mars")} · {sourceText(p.name)}</option>)}
          </select>
        </label>
        <div className="min-w-0 sm:max-w-xs sm:shrink-0 sm:self-center">
          <ul aria-label={translate("rankingVariables")} className="relative flex w-fit max-w-full divide-x divide-slate-400 text-xs font-medium sm:ml-auto">
            {rankingWeights.map(weight => (
              <li key={weight.id} className="group first:pr-2 last:pl-2">
                <span tabIndex={0} aria-describedby={`${weightHintId}-${weight.id}`}
                  className="inline-flex min-h-8 cursor-help items-center rounded-xs bg-[#0042A6] px-2 py-0.5 text-white">
                  {translate(weight.label)}
                </span>
                <div className="invisible absolute inset-x-0 top-full z-20 pt-1 group-has-[:focus-visible]:visible [@media(hover:hover)]:group-hover:visible">
                  <p id={`${weightHintId}-${weight.id}`} role="tooltip"
                    className="rounded border border-slate-200 bg-white p-2 text-black shadow-sm">{translate(weight.explanation)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section aria-label={translate("candidateSearch")} className="flex min-h-0 min-w-0 flex-col gap-3 lg:flex-1">
        {(catalog || d.error) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm">
          {catalog && !d.busy && <span className="tabular-nums">{d.results.length} / {d.eligible.length} <Message id="processed" /> {d.ranked.length} <Message id="comparable" /></span>}
          {!d.busy && (catalog?.archived || d.results.some(result => result.archived)) && <span className="text-xs">{translate("archivedData")}</span>}
          {catalog && <button type="button" className="ml-auto text-xs underline underline-offset-2" onClick={d.download}>{translate("exportJson")}</button>}
          {d.error && <p role="alert" className="w-full border border-slate-300 bg-white p-2">{sourceText(d.error)}</p>}
        </div>
        )}
      <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:flex-1 lg:grid-rows-[minmax(0,1fr)]">
        <section aria-label={preview ? translate("visualComparison") : translate("peruOverview")}
          className={`flex min-w-0 flex-col overflow-hidden rounded border border-[#8d9297] bg-white lg:min-h-0 ${preview ? "p-3" : ""}`}>
          {preview && (
            <div className="mb-2 flex shrink-0 flex-wrap items-baseline justify-between gap-x-2">
              <h2 className="text-lg font-bold">{translate("visualComparison")}</h2>
              <button type="button" onClick={() => setShowOverview(true)}
                className="text-sm font-medium text-[#0042A6] underline underline-offset-4">{translate("viewPeru")}</button>
            </div>
          )}
          <div className="min-h-0 lg:flex-1 lg:[container-type:size]">
            {preview ? (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:[&_h3]:min-h-10">
                <div className={previewWidth}>
                  <CandidatePreview key={preview.site.id} site={preview.site} spacingKm={spacingKm} />
                </div>
                <div className={previewWidth}>
                  <ComparisonPhoto key={profile.id} spacingKm={spacingKm} site={{
                    label: `${profile.body} · ${sourceText(profile.name)}`,
                    body,
                    radiusKm: profile.radiusKm,
                    center: profile.center,
                    samples: profile.samples,
                  }} />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                    <p className="text-xs"><Message id="gridOf" /> {2 * spacingKm} × {2 * spacingKm} <Message id="kmRadius" /> {spacingKm} km</p>
                    <a href={viewer.href} target="_blank" rel="noreferrer"
                      className={`${primaryActionClass} ml-auto`}>
                      {viewer.label}
                    </a>
                  </div>
                </div>
              </div>
            ) : <PeruOverview sites={entries.map(entry => entry.site)} select={id => { selectCandidate(id); setShowOverview(false); }} />}
          </div>
        </section>
          {selected ? (
            <CandidateList entries={entries} selected={preview?.site.id} select={id => { selectCandidate(id); setShowOverview(false); }}
              profile={profile.id} />
          ) : !d.busy && !d.error && (
            <section className="grid min-h-24 content-center rounded border border-[#8d9297] bg-white p-3 text-center">
              <h2 className="text-lg font-bold">{translate("candidatesInPeru")}</h2>
              <p className="text-sm">{d.complete ? translate("noComparableCandidates") : translate("noResults")}</p>
            </section>
          )}
      </div>
      </section>
    </div>
  );
}

