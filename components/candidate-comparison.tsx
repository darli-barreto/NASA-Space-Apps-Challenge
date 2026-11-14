import { useSourceText } from "./source-text";
import { useTranslations } from "next-intl";
import { candidateArea } from "@/lib/catalog-area-terrain";
import { useLanguage } from "./display-preferences";
import type { AnalogCandidate } from "@/lib/analog-search";
import type { PlanetaryProfile } from "@/lib/planetary";
import type { useDiscovery } from "./use-discovery";
import ComparisonPhotos from "./comparison-photos";
import DetailedTerrainPanel from "./detailed-terrain-panel";
import TerrainAreaPanel from "./terrain-area-panel";
import RankingBreakdown from "./ranking-breakdown";
import TerrainRadar from "./terrain-radar";
import TerrainGridComparison from "./terrain-grid-comparison";
import PilotEvidence from "./pilot-evidence";

export default function CandidateComparison({site,row,profile,total}:{
  site:AnalogCandidate;row:ReturnType<typeof useDiscovery>["ranked"][number];profile:PlanetaryProfile;total:number;
}) {
  const sourceText = useSourceText();
  const { t } = useLanguage();
  const translate = useTranslations();
  const area = candidateArea(site, profile.id);
  const pilot = site.id===55742 && profile.id==="moon-mons-mouton";
  const earthLabel=`${sourceText("Tierra")} · INGEMMET ${site.id}`;
  const planetLabel=`${sourceText(profile.body)} · ${sourceText(profile.name).split(" · ")[0]}`;
  return <div className="space-y-6 text-black">
    <div><h2 className="text-2xl font-semibold">{translate("earthAnd")} {t(profile.body, profile.body === "Luna" ? "the Moon" : "Mars")}</h2>
      <p className="mt-2 text-sm">{translate("measurementsAtComparableScalesMissionSuitabilityRequiresA")}</p></div>
    <dl className="grid grid-cols-1 gap-4 border-y border-slate-200 py-4 sm:grid-cols-3">
      <div><dt className="text-xs">{translate("nominalWindow")}</dt><dd className="mt-1 text-xl">4 × 4 km</dd></div>
      <div><dt className="text-xs">{translate("initialScreening")}</dt><dd className="mt-1 text-xl">{translate("9PointsPerSite")}</dd></div>
      <div><dt className="text-xs">{translate("fullAreaAnalysis")}</dt><dd className="mt-1 text-lg">{area ? translate("available") : translate("noDataForTheseCoordinates")}</dd></div>
    </dl>
    <ComparisonPhotos earth={{label:earthLabel,center:site,radiusKm:6371,body:"earth",samples:row.samples}}
      planet={{label:planetLabel,center:profile.center,radiusKm:profile.radiusKm,body:profile.body==="Luna"?"moon":"mars",samples:profile.samples}}
      spacingKm={profile.signature.spacingKm}/>
    {area && <TerrainAreaPanel area={area} />}
    <DetailedTerrainPanel site={site} profileId={profile.id} body={profile.body} initial={row.detailed}/>
    <section className="border-t border-slate-300 pt-6" aria-labelledby="screening-heading">
      <h3 id="screening-heading" className="text-xl font-semibold">{translate("howTheInitialRankWasCalculated")}</h3>
      <p className="mt-2 text-sm">{t(`Nueve nodos a 2 km. Puesto ${row.rankMin}–${row.rankMax} de ${total} con diferentes pesos.`, `Nine points spaced 2 km apart. Rank ${row.rankMin}–${row.rankMax} out of ${total} under different weights.`)}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <RankingBreakdown score={row.score} mobility={row.mobility} body={profile.body}/>
        <TerrainRadar variables={row.mobility.variables} body={profile.body}/>
      </div>
      <TerrainGridComparison earth={{label:earthLabel,sourceName:"NASA/NGA · SRTM",sourceUrl:row.source,samples:row.samples}}
        planet={{label:planetLabel,sourceName:profile.body==="Luna"?"NASA PDS · LOLA":"NASA PDS · MOLA",sourceUrl:profile.labelUrl,samples:profile.samples}}
        spacingKm={profile.signature.spacingKm}/>
    </section>
    {pilot && <PilotEvidence/>}
  </div>;
}
