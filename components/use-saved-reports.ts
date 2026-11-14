import { useMemo, useSyncExternalStore } from "react";
import { type Analysis } from "@/lib/analysis";
import { readSavedReports } from "@/lib/saved-reports";

const key = "terra-reports-v1";
const eventName = "terra-reports-changed";
function snapshot() {
  try { return localStorage.getItem(key) ?? "[]"; } catch { return "[]"; }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) listener(); };
  window.addEventListener("storage", storage);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(eventName, listener);
  };
}
export function useSavedReports(onError: () => void) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const saved = useMemo(() => readSavedReports(raw), [raw]);
  function setSaved(update: (previous: Analysis[]) => Analysis[]) {
    try {
      localStorage.setItem(key, JSON.stringify(update(readSavedReports(snapshot())).slice(0, 20)));
      window.dispatchEvent(new Event(eventName));
    } catch { onError(); }
  }
  return [saved, setSaved] as const;
}
