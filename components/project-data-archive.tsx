"use client";
import { useSourceText } from "./source-text";
import { Message } from "@/components/message";


import { useState } from "react";

const entries = [
  ["planetaryProfiles", "Referencias planetarias y ventanas de los modelos"],
  ["archives.catalog", "Catálogo de candidatos de INGEMMET"],
  ["archives.ingemmet", "Respuesta geomorfológica de INGEMMET"],
  ["archives.srtm", "Elevaciones terrestres y respuestas SRTM"],
  ["archives.controls", "Controles topográficos"],
  ["archives.peruBoundary", "Contorno cartográfico de Perú"],
  ["pilot.terrain", "Modelos de elevación y muestras del piloto"],
  ["pilot.terrainAggregated", "Elevaciones agregadas por celda"],
  ["pilot.terrainSensitivity", "Sensibilidad a escala y ubicación"],
  ["pilot.sentinel", "Sentinel-2 · color y clasificación"],
  ["pilot.lroc", "LROC NAC · imagen y metadatos"],
  ["pilot.geology", "Geología de Andagua y Mons Mouton"],
  ["pilot.earthMaterials", "Materiales terrestres"],
  ["pilot.lunarMineralogy", "Mineralogía lunar y cobertura"],
  ["pilot.radar", "RADARSAT-1, RCM y Mini-RF"],
  ["pilot.neutrons", "LEND · conteos de neutrones"],
  ["archives.catalogPowerSurface", "Temperatura superficial del catálogo · NASA POWER"],
  ["archives.catalogThermal", "Observaciones MODIS del catálogo"],
  ["pilot.thermal", "MODIS y Diviner · muestras térmicas"],
  ["analysis", "Pesos, modelos y métricas derivadas"],
] as const;

export default function ProjectDataArchive() {
  const text = useSourceText();
  const [archive, setArchive] = useState<Record<string, unknown>>();
  const [selected, setSelected] = useState<string>(entries[0][0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const value = selected.split(".").reduce<unknown>((data, field) => (data as Record<string, unknown> | undefined)?.[field], archive);

  async function loadArchive() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/data/archive");
      if (!response.ok) throw new Error("Archivo no disponible");
      setArchive(await response.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold"><Message id="projectDataArchive" /></h2>
      {archive ? (
        <>
          <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <Message id="dataset" />
            <select className="max-w-full rounded border border-slate-300 bg-white p-2" value={selected} onChange={event => setSelected(event.target.value)}>
              {entries.map(([id, label]) => <option key={id} value={id}>{text(label)}</option>)}
            </select>
          </label>
          <pre tabIndex={0} aria-label={text("Valores originales en JSON")} className="max-h-96 overflow-auto rounded border border-slate-200 bg-white p-3 text-xs">{JSON.stringify(value, null, 2) ?? text("Sin datos disponibles")}</pre>
        </>
      ) : <button type="button" onClick={loadArchive} disabled={loading} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium">{loading ? text("Cargando archivo…") : text("Consultar valores completos")}</button>}
      {error && <p role="alert" className="text-sm"><Message id="theArchiveIsUnavailableTryAgain" /></p>}
    </section>
  );
}
