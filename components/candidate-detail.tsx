"use client";
import { useSourceText } from "./source-text";

import { useTranslations } from "next-intl";

import { useLanguage } from "./display-preferences";

import { useEffect, useRef, useState } from "react";
import type { Site } from "@/lib/analysis";
import { candidateName, workspaceWidth } from "@/lib/workspace-routes";
import CandidateCard from "./candidate-card";
import CandidateHero from "./candidate-hero";
import { useDiscoveryContext } from "./discovery-context";
import { useDiscovery } from "./use-discovery";

type DiscoveryState = ReturnType<typeof useDiscovery>;
type Props = {
  id: number;
  inspect: (site: Site, body: "Luna" | "Marte") => void;
};
const tabs = [
  { id: "resumen", label: "Resumen", en: "Overview" },
  { id: "comparacion", label: "Comparación", en: "Comparison" },
  { id: "fuentes", label: "Fuentes", en: "Sources" },
] as const;

function CandidateReport({
  id,
  inspect,
  discovery: d,
}: Props & { discovery: DiscoveryState }) {
  const sourceText = useSourceText();
  const { t } = useLanguage();
  const translate = useTranslations();
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("resumen");
  const index = d.ranked.findIndex((row) => row.id === id);
  const row = d.ranked[index];
  const site = d.catalog?.candidates.find((candidate) => candidate.id === id);
  const body = d.profile.body === "Luna" ? "Luna" : "Marte";

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white">
      <CandidateHero
        id={id}
        site={site}
        reference={`${t(body, body === "Luna" ? "Moon" : "Mars")} · ${sourceText(d.profile.name)}`}
        inspect={
          site &&
          (() =>
            inspect(
              {
                name: candidateName(id),
                lat: site.lat,
                lon: site.lon,
                radius: 3,
              },
              body,
            ))
        }
      >
        {row && site && (
          <div
            role="tablist"
            aria-label={translate("reportSections")}
            className="flex w-full gap-1 sm:w-auto sm:gap-3"
          >
            {tabs.map(({ id, label, en }, index) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={active === id}
                aria-controls={`panel-${id}`}
                tabIndex={active === id ? 0 : -1}
                onClick={() => setActive(id)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : event.key === "ArrowRight"
                          ? (index + 1) % tabs.length
                          : event.key === "ArrowLeft"
                            ? (index + tabs.length - 1) % tabs.length
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setActive(tabs[next].id);
                  document.getElementById(`tab-${tabs[next].id}`)?.focus();
                }}
                className="min-h-11 rounded-t-lg border border-b-0 border-white/30 bg-[#151622]/85 px-3 text-sm font-medium hover:bg-[#262839] focus-visible:outline-white aria-selected:border-white aria-selected:bg-white aria-selected:text-black [[data-dark]_&]:aria-selected:bg-slate-900 [[data-dark]_&]:aria-selected:text-white sm:px-6 sm:text-base"
              >
                {t(label, en)}
              </button>
            ))}
          </div>
        )}
      </CandidateHero>
      <div className={`${workspaceWidth} py-6 sm:py-9`}>
        {row && site ? (
          tabs.map(({ id }) => (
            <div
              key={id}
              id={`panel-${id}`}
              role="tabpanel"
              aria-labelledby={`tab-${id}`}
              hidden={active !== id}
              tabIndex={0}
              className="mx-auto max-w-6xl"
            >
              {active === id && (
                <CandidateCard
                  site={site}
                  row={row}
                  rank={index + 1}
                  total={d.ranked.length}
                  profile={d.profile}
                  tab={id}
                  download={d.download}
                />
              )}
            </div>
          ))
        ) : (
          <div role="status" className="mx-auto max-w-6xl">
            <p>
              {sourceText(d.error) ||
                (d.complete || (d.catalog && site?.gridInside !== 9)
                  ? translate("noComparableMeasurementsForThisCandidate")
                  : translate("loadingReport"))}
            </p>
            {d.error && (
              <button
                type="button"
                onClick={() => void d.search()}
                className="mt-2 underline"
              >
                {translate("retry")}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DirectCandidate({
  id,
  profileId,
  inspect,
}: Props & { profileId: string }) {
  const discovery = useDiscovery(profileId);
  const started = useRef(false);
  const { search } = discovery;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void search();
  }, [search]);
  return <CandidateReport id={id} inspect={inspect} discovery={discovery} />;
}

export default function CandidateDetail({
  id,
  profileId,
}: {
  id: number;
  profileId: string;
}) {
  const { discovery, inspect } = useDiscoveryContext();
  const hasResults =
    discovery.profileId === profileId &&
    (discovery.complete || discovery.ranked.some((row) => row.id === id));
  return hasResults ? (
    <CandidateReport id={id} inspect={inspect} discovery={discovery} />
  ) : (
    <DirectCandidate id={id} profileId={profileId} inspect={inspect} />
  );
}
