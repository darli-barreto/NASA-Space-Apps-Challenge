import { useTranslations } from "next-intl";
import { Message } from "@/components/message";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { AnalogCandidate } from "@/lib/analog-search";
import { satelliteUrl, worldImagery } from "@/lib/comparison-imagery";
import { candidateName, workspaceWidth } from "@/lib/workspace-routes";
import { primaryActionClass } from "./primitives";

export default function CandidateHero({ id, site, reference, inspect, children }: {
  id: number;
  site?: AnalogCandidate;
  reference: string;
  inspect?: () => void;
  children?: React.ReactNode;
}) {
  const translate = useTranslations();
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const name = candidateName(id);

  return (
    <header className="bg-[#151622] text-white">
      <div className={`${workspaceWidth} relative isolate`}>
        {site && !imageUnavailable && (
          <div className="absolute inset-0 -z-10 overflow-hidden sm:left-[34%] sm:right-6 lg:right-8">
            <Image src={satelliteUrl(site.lat, site.lon, 6000, 1024)} alt="" fill unoptimized loading="eager"
              className="object-cover" onError={() => setImageUnavailable(true)} />
            <div className="absolute inset-0 bg-linear-to-r from-[#151622] via-[#151622]/65 to-[#151622]/10" />
            <div className="absolute inset-0 bg-linear-to-t from-[#151622]/90 via-transparent to-[#151622]/35" />
          </div>
        )}
        <div className="flex min-h-72 flex-col justify-between gap-8 pt-6 sm:min-h-[25rem] sm:pt-9">
          <nav aria-label={translate("reportNavigation")} className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="underline underline-offset-4">{translate("candidates")}</Link>
            <span aria-hidden="true">›</span><span aria-current="page">{name}</span>
          </nav>
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{name}</h1>
            <p className="mt-3 text-base sm:text-xl">{reference}</p>
            {inspect && <button type="button" onClick={inspect} className={`${primaryActionClass} mt-5`}>{translate("inspectOnMap")}</button>}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
            {children}
            {site && !imageUnavailable && (
              <a href={worldImagery} target="_blank" rel="noreferrer" className="-order-1 w-full text-xs underline underline-offset-2 sm:order-0 sm:ml-auto sm:w-auto sm:pb-2">
                <Message id="esriMaxarEarthstarGeographicsAndTheGisCommunity" />
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
