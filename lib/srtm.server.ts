// Serialize access to the independent public SRTM distributor (1 request/s).
let queue: Promise<void> = Promise.resolve();
let last = 0;
let pending = 0;
const maxPending = 4;
export type SrtmResponse = { status: string; results: { dataset?: string; elevation?: number | null; location?: { lat: number; lng: number } }[] };
const elevationCache = new Map<string, { at: number; value: SrtmResponse }>();
export async function srtm(url: string): Promise<SrtmResponse> {
  const cached = elevationCache.get(url);
  if (cached && Date.now() - cached.at < 86400000) return cached.value;
  // Bound local backlog so overload cannot create an indefinitely waiting request.
  if (pending >= maxPending) throw new Error("SRTM ocupado. Reintenta en unos segundos.");
  pending += 1;
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    const already = elevationCache.get(url);
    if (already && Date.now() - already.at < 86400000) return already.value;
    const wait = Math.max(0, last + 1100 - Date.now());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    last = Date.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(7000), next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`SRTM/Open Topo Data: HTTP ${response.status}. Se conserva el avance; reintenta después.`);
    const value = await response.json();
    if (value?.status !== "OK" || !Array.isArray(value.results) || value.results.some((row: unknown) => !row || typeof row !== "object")) throw new Error("SRTM no entregó una respuesta válida.");
    if (elevationCache.size >= 200) elevationCache.delete(elevationCache.keys().next().value!);
    elevationCache.set(url, { at: Date.now(), value });
    return value;
  } finally { pending -= 1; release(); }
}
