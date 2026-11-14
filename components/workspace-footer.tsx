import { useTranslations } from "next-intl";
import { Message } from "@/components/message";
import { challengeResourcesUrl } from "@/lib/research-sources";
import Link from "next/link";
import { workspaceRoutes } from "@/lib/workspace-routes";

export default function WorkspaceFooter() {
  const translate = useTranslations();
  return (
    <footer className="border-t border-slate-200 bg-[#1b1b1b]">
      <div className="mx-auto text-white w-full max-w-[1600px] flex flex-col items-center justify-center gap-x-6 gap-y-2 px-4 py-4 text-center text-base sm:flex-row sm:flex-wrap sm:px-7">
        <p><strong>TERRA</strong> <Message id="projectForNasaSpaceApps2026" /></p>
        <div className="flex flex-wrap items-center justify-center gap-x-4">
          <Link href={workspaceRoutes.Comparar} className="text-base font-medium underline underline-offset-2">{translate("compareReports")}</Link>
          <Link href={workspaceRoutes.Metodología} className="inline-flex min-h-9 items-center text-base font-medium underline underline-offset-2">{translate("methodology")}</Link>
          <a className="inline-flex min-h-9 items-center text-base font-medium underline underline-offset-2" href={challengeResourcesUrl} target="_blank" rel="noreferrer">{translate("challengeResources")}</a>
        </div>
      </div>
    </footer>
  );
}
