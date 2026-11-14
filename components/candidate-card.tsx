import SourceText from "@/components/source-text";
import { useTranslations } from "next-intl";
import { Message } from "@/components/message";
import CandidateComparison from "./candidate-comparison";
import type { AnalogCandidate } from "@/lib/analog-search";
import type { useDiscovery } from "./use-discovery";
import { polarReferenceId, type PlanetaryProfile } from "@/lib/planetary";
import { planetaryViewer } from "@/lib/comparison-imagery";
import ReportSection from "./report-section";
import { primaryActionClass } from "./primitives";

type Props = {
  site: AnalogCandidate;
  row: ReturnType<typeof useDiscovery>["ranked"][number];
  rank: number;
  total: number;
  profile: PlanetaryProfile;
  tab: "resumen" | "comparacion" | "fuentes";
  download: () => void;
};

export default function CandidateCard({
  site,
  row,
  rank,
  total,
  profile,
  tab,
  download,
}: Props) {
  const translate = useTranslations();
  const spacingKm = profile.signature.spacingKm;
  const body = profile.body === "Luna" ? "moon" : "mars";
  const viewer = planetaryViewer(
    body,
    profile.center,
    profile.radiusKm,
    spacingKm,
  );

  return (
    <article className="min-w-0">
      {tab === "resumen" && (
        <>
          <dl className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-slate-300 [&_dt]:text-sm [&_dt]:font-semibold">
            <div className="sm:pr-5">
              <dt>{translate("location")}</dt>
              <dd>
                {site.lat.toFixed(5)}°, {site.lon.toFixed(5)}°
              </dd>
            </div>
            <div className="sm:px-5">
              <dt>{translate("rankingPosition")}</dt>
              <dd>
                {translate("rankOfTotal", { rank, total })} <Message id="distance" /> {row.distance.toFixed(3)}
              </dd>
            </div>
            <div className="sm:pl-5">
              <dt>{translate("studyWindow")}</dt>
              <dd>
                {2 * spacingKm} × {2 * spacingKm} <Message id="km9Nodes" />
              </dd>
            </div>
          </dl>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed">
            <SourceText value={site.description} />
          </p>
          <ReportSection title={translate("interpretationAndLimitations")}>
            <div className="max-w-3xl space-y-3 text-sm leading-relaxed">
              <p>
                {profile.id === polarReferenceId
                  ? <SourceText value="La clase volcánica delimita la búsqueda terrestre. La analogía de proceso con Mons Mouton está sin sustentar." />
                  : <SourceText value={site.geology} />}
              </p>
              <p>
                <SourceText value={site.mineralogy} /> <Message id="regolithWeatheringObstaclesAndNoveltyRemainUnverified" />
              </p>
              <p>
                <strong><Message id="proposedExplorationTest" /></strong> <SourceText value={profile.use} />
              </p>
            </div>
          </ReportSection>
        </>
      )}
      {tab === "comparacion" && <CandidateComparison site={site} row={row} profile={profile} total={total} />}
      {tab === "fuentes" && (
        <>
          <h2 className="text-xl font-semibold">{translate("reportSources")}</h2>
          <ul className="mt-3 space-y-3 text-sm [&_a]:text-[#0042A6] [&_a]:underline [&_a]:underline-offset-4">
            <li>
              <a href={site.source} target="_blank" rel="noreferrer">
                INGEMMET
              </a>{" "}
              <Message id="earthLandformUnit" />
            </li>
            <li>
              <a href={row.source} target="_blank" rel="noreferrer">
                <Message id="srtmNasaNgaViaOpenTopoData" />
              </a>{" "}
              <Message id="earthElevations" />
            </li>
            <li>
              <a href={profile.labelUrl} target="_blank" rel="noreferrer">
                NASA PDS · {body === "moon" ? "LOLA" : "MOLA"}
              </a>{" "}
              <Message id="referenceElevations" />
            </li>
            <li>
              <a href={viewer.href} target="_blank" rel="noreferrer">
                {viewer.label}
              </a>
            </li>
          </ul>
          <button
            type="button"
            onClick={download}
            className={`${primaryActionClass} mt-6`}
          >
            {translate("exportJson")}
          </button>
        </>
      )}
    </article>
  );
}
