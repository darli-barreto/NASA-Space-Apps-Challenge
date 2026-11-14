import { Message } from "@/components/message";
import SourceText from "@/components/source-text";

import { candidates, validSite, type Site, type Settings } from "@/lib/analysis";

type Props = {
  site: Site;
  settings: Settings;
  busy: boolean;
  setSite: (site: Site) => void;
  setSettings: (settings: Settings) => void;
  analyze: () => void;
};

export default function SiteProperties({ site, settings, busy, setSite, setSettings, analyze }: Props) {
  return (<aside className="w-full shrink-0 border-b border-slate-200 bg-white p-4 md:w-[245px] md:border-r md:border-b-0 [&_section]:mb-4 [&_section]:border-b [&_section]:border-slate-200 [&_section]:pb-4 [&_h3]:mb-3 [&_h3]:text-xs [&_h3]:font-semibold [&_h3>span]:hidden">
        <section><h3><Message id="earthLocation" /></h3><label className="block text-xs text-black"><Message id="areaName" /><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" maxLength={120} value={site.name} onChange={e => setSite({ ...site, name: e.target.value })}/></label><div className="my-3 grid grid-cols-2 gap-2"><label className="block text-xs text-black"><Message id="latitude" /><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" type="number" step="any" min={-90} max={90} value={Number.isFinite(site.lat) ? site.lat : ""} onChange={e => setSite({ ...site, lat: e.target.value === "" ? NaN : Number(e.target.value) })}/></label><label className="block text-xs text-black"><Message id="longitude" /><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" type="number" step="any" min={-180} max={180} value={Number.isFinite(site.lon) ? site.lon : ""} onChange={e => setSite({ ...site, lon: e.target.value === "" ? NaN : Number(e.target.value) })}/></label></div><label className="mt-3 block text-xs text-black [&_input]:accent-[#0042A6]"><Message id="areaRadius" /> <b>{site.radius} km</b><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" type="range" min="1" max="25" step="0.01" value={site.radius} onChange={e => setSite({ ...site, radius: +e.target.value })}/></label><p className="my-2 text-xs leading-relaxed text-black"><Message id="selectOnTheMapOrEnterCoordinates" /></p></section>
        <section><h3><Message id="explorationContext" /></h3><div className="mb-3 flex border border-slate-200">{["Luna", "Marte"].map(t => <button key={t} className={`flex-1 px-2 py-1.5 text-xs${settings.target === t ? " bg-[#0042A6]/10 font-semibold text-black" : ""}`} onClick={() => setSettings({ ...settings, target: t as Settings["target"] })}><SourceText value={t} /></button>)}</div><label className="block text-xs text-black"><Message id="intendedUse" /><select className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" value={settings.task} onChange={e => setSettings({ ...settings, task: e.target.value as Settings["task"] })}><option value="Movilidad robótica"><Message id="roboticMobility" /></option><option value="Operaciones humanas"><Message id="humanOperations" /></option><option value="Procesos ambientales"><Message id="environmentalProcesses" /></option></select></label></section>
        <section><h3><Message id="researchCriteria" /></h3><div className="my-3 grid grid-cols-2 gap-2"><label className="block text-xs text-black"><Message id="maxReliefM" /><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" type="number" min="0" max="10000" value={settings.relief} onChange={e => setSettings({ ...settings, relief: +e.target.value })}/></label><label className="block text-xs text-black"><Message id="maxRainMmD" /><input className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" type="number" min="0" max="100" step="0.1" value={settings.rain} onChange={e => setSettings({ ...settings, rain: +e.target.value })}/></label></div><p className="my-2 text-xs leading-relaxed text-black"><Message id="editableScreeningThresholdsMissionRequirementsNeedSeparateValidation" /></p></section>
        <button className="inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-bold text-black border-[#0042A6] bg-white hover:bg-[#0042A6]/10 w-full" disabled={busy || !validSite(site)} onClick={analyze}>{busy ? <span className="size-3 animate-spin rounded-full border border-white/40 border-t-white"/> : null}<SourceText value={busy ? "Consultando fuentes…" : "Analizar ubicación"} /></button>
        <label className="block text-xs text-black mt-4"><Message id="exampleSites" />
          <select className="mt-1 block w-full rounded-sm border border-slate-300 bg-white px-2 py-1.5 text-sm text-black" disabled={busy} value={candidates.find(s => s.name === site.name)?.name ?? ""}
            onChange={event => {
              const selected = candidates.find(s => s.name === event.target.value);
              if (selected) setSite(selected);
            }}>
            <option value="" disabled><Message id="chooseSite" /></option>
            {candidates.map(s => <option key={s.name} value={s.name}><SourceText value={s.name} /></option>)}
          </select>
        </label>
      </aside>);
}
