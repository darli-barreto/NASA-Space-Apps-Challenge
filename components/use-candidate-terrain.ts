import { useEffect, useState } from "react";
import type { DetailedTerrain } from "@/lib/detailed-terrain";
import type { AnalogCandidate } from "@/lib/analog-search";

export function useCandidateTerrain(site: AnalogCandidate, profileId: string, initial?: DetailedTerrain) {
  const [attempt,setAttempt]=useState(0);
  const key=`${profileId}:${site.id}:${site.lat}:${site.lon}:${attempt}`;
  const [response,setResponse]=useState<{key:string; data?:DetailedTerrain; error?:string}>();
  const seeded = initial?.profileId===profileId && initial.status!=="unavailable" ? initial : undefined;
  useEffect(()=>{
    if (seeded && attempt===0) return;
    const controller=new AbortController();
    async function read() {
      try {
        const r=await fetch("/api/analog-search",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({profile:profileId,ids:[site.id],detail:true}),
          signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
        const data:DetailedTerrain=await r.json();
        const center=data.samples?.earth?.[40];
        if (!r.ok || data.profileId!==profileId || data.candidateId!==site.id || !center ||
            Math.abs(center.lat-site.lat)>1e-6 || Math.abs(center.lon-site.lon)>1e-6) throw new Error("Ubicación o respuesta incompatible.");
        if (!controller.signal.aborted) setResponse({key,data});
      } catch {
        if (!controller.signal.aborted) setResponse({key,error:"No se pudo completar el detalle. Se conserva el análisis inicial."});
      }
    }
    void read();
    return ()=>controller.abort();
  },[key,profileId,site.id,site.lat,site.lon,seeded,attempt]);
  const current=response?.key===key ? response : undefined;
  return {data:current?.data ?? (attempt===0 ? seeded : undefined),error:current?.error,
    retry:()=>setAttempt(n=>n+1)};
}
