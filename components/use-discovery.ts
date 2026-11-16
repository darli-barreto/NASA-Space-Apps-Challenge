"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { terrainMetrics } from "@/lib/terrain-metrics";
import { assessMobility } from "@/lib/mobility-assessment";
import { rankedContrasts } from "@/lib/analog-search";
import type { AnalogCatalog, Contrast } from "@/lib/analog-search";
import { defaultPlanetaryProfile, planetaryProfiles } from "@/lib/planetary";
import { downloadDiscovery, type Batch } from "@/lib/discovery-export";
import { refineCandidates } from "@/lib/refine-candidates";
import { useProtocolRecords } from "./use-protocol-records";

export function useDiscovery(initialProfileId = defaultPlanetaryProfile) {
  const [profileId, setProfileId] = useState(initialProfileId);
  const records = useProtocolRecords();
  const profile = planetaryProfiles.find((p) => p.id === profileId)!;
  const [catalog, setCatalog] = useState<AnalogCatalog | null>(null);
  const [results, setResults] = useState<Contrast[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [searchId, setSearchId] = useState(0);
  const stop = useRef(false),
    controller = useRef<AbortController | null>(null);
  useEffect(() => () => { stop.current = true; controller.current?.abort(); }, []);
  const eligible = catalog?.candidates.filter((c) => c.gridInside === 9) ?? [];
  const referenceTerrainMetrics = useMemo(() =>
    terrainMetrics(profile.samples.map(point => point.elevation), 3, profile.signature.spacingKm * 1000),
  [profile]);
  const ranked = useMemo(() => rankedContrasts(results, profile.signature).map(row => {
    const supplementalTerrainMetrics = terrainMetrics(
      row.samples.map(point => point.elevation), 3, profile.signature.spacingKm * 1000,
    );
    return {
      ...row,
      supplementalTerrainMetrics,
      mobility: assessMobility(supplementalTerrainMetrics, referenceTerrainMetrics),
    };
  }), [results, profile, referenceTerrainMetrics]);
  const complete = !!catalog && results.length === eligible.length;
  async function search() {
    if (controller.current) return;
    setBusy(true);
    setError("");
    stop.current = false;
    const abort = new AbortController();
    controller.current = abort;
    try {
      let data = catalog;
      if (!data) {
        const r = await fetch("/api/analog-search", {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]),
        });
        data = await r.json();
        if (!r.ok)
          throw new Error((data as unknown as { error: string }).error);
        setCatalog(data);
      }
      if (!data) throw new Error("No se recibió el catálogo.");
      const collected = [...results];
      const done = new Set(results.map((r) => r.id));
      const pending = data.candidates.filter(
        (c) => c.gridInside === 9 && !done.has(c.id),
      );
      for (let i = 0; i < pending.length && !stop.current; i += 8) {
        const r = await fetch("/api/analog-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: profileId,
            archivedCatalog: data.archived === true,
            ids: pending.slice(i, i + 8).map((c) => c.id),
          }),
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]),
        });
        const batch = await r.json();
        if (!r.ok) throw new Error(batch.error);
        if (abort.signal.aborted) break;
        if (batch.profile !== profileId || !Array.isArray(batch.results)) throw new Error("Respuesta de contraste incompatible.");
        collected.push(...batch.results);
        setResults((previous) => [...previous, ...batch.results]);
        setBatches((previous) => [...previous, batch]);
      }
      if (!abort.signal.aborted) await refineCandidates(collected, profile, data.archived === true, abort.signal,
        detailed => setResults(previous => previous.map(row => row.id === detailed.candidateId ? { ...row, detailed } : row)));
    } catch (e) {
      if (!stop.current)
        setError(
          e instanceof TypeError || (e instanceof Error && e.name === "TimeoutError")
            ? "No se pudo conectar con la aplicación. Reintenta la búsqueda."
            : e instanceof Error ? e.message : "No se pudo completar la búsqueda.",
        );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  function pause() {
    stop.current = true;
    controller.current?.abort();
  }

  // Returns the search to its initial state, as if the page had just been opened.
  function reset() {
    pause();
    controller.current = null;
    setProfileId(initialProfileId);
    setCatalog(null);
    setResults([]);
    setBatches([]);
    setBusy(false);
    setError("");
    setSearchId(id => id + 1);
  }

  function download() {
    downloadDiscovery({ profileId, profile, catalog, ranked, referenceTerrainMetrics, complete, results, batches, records });
  }

  return {
    profileId, setProfileId, profile, catalog, results, busy, error,
    pause, reset, searchId, eligible, ranked, complete, search, download,
  };
}
