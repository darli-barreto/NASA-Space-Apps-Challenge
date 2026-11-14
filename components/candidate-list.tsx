import { useTranslations } from "next-intl";
import type { AnalogCandidate } from "@/lib/analog-search";
import Link from "next/link";
import { candidateHref, candidateName } from "@/lib/workspace-routes";

type CandidateEntry = { site: AnalogCandidate; distance: number };

export default function CandidateList({ entries, selected, select, profile }: {
  entries: CandidateEntry[];
  selected: number | undefined;
  select: (id: number) => void;
  profile: string;
}) {
  const translate = useTranslations();
  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded border border-slate-300 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="text-lg font-bold">{translate("candidatesInPeru")}</h2>
        <span className="text-sm tabular-nums">{entries.length} {translate("comparable")}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_3.5rem] gap-2 border-b border-slate-200 px-2 pb-2 text-xs font-semibold">
        <span>{translate("candidate")}</span><span className="text-right">{translate("distance2")}</span><span className="text-center">{translate("details")}</span>
      </div>
      <ol className="min-h-0 max-h-[min(60dvh,34rem)] divide-y divide-slate-200 overflow-y-auto text-sm lg:flex lg:max-h-none lg:flex-1 lg:flex-col">
        {entries.map(({ site, distance }, index) => (
          <li key={site.id} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-stretch gap-2 pr-2 lg:min-h-max lg:flex-1">
            <button type="button" aria-pressed={selected === site.id} onClick={() => select(site.id)}
              className="flex min-w-0 items-center justify-between gap-2 py-2 pl-2 text-left tabular-nums hover:bg-slate-50 aria-pressed:bg-blue-50 [[data-dark]_&]:aria-pressed:bg-slate-700 [[data-dark]_&]:hover:bg-slate-800 aria-pressed:font-semibold">
              <span>{index + 1}. {candidateName(site.id)}</span><span>{distance.toFixed(3)}</span>
            </button>
            <Link href={candidateHref(profile, site.id)} aria-label={`Ficha de ${candidateName(site.id)}`}
              className="flex items-center justify-center font-medium text-[#0042A6] underline underline-offset-2">{translate("report")}</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
