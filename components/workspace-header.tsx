import { useTranslations } from "next-intl";
import PreferenceMenu from "./preference-menu";
import { Flag, ThemeIcon } from "./preference-icons";
import { useLanguage, useTheme } from "./display-preferences";
import Link from "next/link";
import { projectName } from "@/lib/project-identity";
import { workspaceRoutes, workspaceWidth } from "@/lib/workspace-routes";
import { primaryActionClass } from "./primitives";

const views = [
  { id: "Descubrir", label: "Descubrir" },
  { id: "Explorar", label: "Mapa" },
  { id: "Datos", label: "Datos" },
] as const;

export default function WorkspaceHeader({ tab, searchAction }: {
  tab: string;
  searchAction: { label: string; disabled: boolean; onClick: () => void };
}) {
  const { language, setLanguage, t } = useLanguage();
  const translate = useTranslations();
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 shrink-0 border-slate-200 bg-[#1b2b85]">
      <div className={`${workspaceWidth} flex flex-col gap-2 py-2 lg:min-h-20 lg:flex-row lg:items-center lg:gap-6`}>
        <div className="flex justify-center items-center min-w-0 gap-2 py-1 text-white sm:gap-3">
          <div className="min-w-0">
            <p className="w-105 max-w-full text-base leading-tight">{projectName}</p>
          </div>
        </div>
        <nav aria-label={translate("mainNavigation")} className="ml-auto flex w-full flex-wrap justify-end gap-1 sm:w-auto sm:gap-1 lg:shrink-0">
          {views.map(({ id, label }) => {
            const active = tab === id || (id === "Explorar" && tab === "Resultados");
            return (
              <Link
                key={id}
                href={workspaceRoutes[id]}
                aria-current={active ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded px-2 text-base font-medium text-white hover:bg-white/10 focus-visible:outline-white aria-[current=page]:underline aria-[current=page]:underline-offset-8 sm:px-4"
              >
                {t(label, id === "Descubrir" ? "Discover" : id === "Explorar" ? "Map" : "Data")}
              </Link>
            );
          })}
          <PreferenceMenu label={translate("language")} value={language} choose={setLanguage} items={[
            { value: "en", label: "English", lang: "en", icon: <Flag language="en" /> },
            { value: "es", label: "Español", lang: "es", icon: <Flag language="es" /> },
          ]} />
          <PreferenceMenu label={translate("theme")} value={theme} choose={setTheme} items={[
            { value: "light", label: translate("light"), icon: <ThemeIcon theme="light" /> },
            { value: "dark", label: translate("dark"), icon: <ThemeIcon theme="dark" /> },
            { value: "system", label: translate("system"), icon: <ThemeIcon theme="system" /> },
          ]} />
          <button type="button" disabled={searchAction.disabled} onClick={searchAction.onClick}
            className={`${primaryActionClass} ml-1 focus-visible:outline-white`}>
            {searchAction.label}
          </button>
        </nav>
      </div>
    </header>
  );
}
