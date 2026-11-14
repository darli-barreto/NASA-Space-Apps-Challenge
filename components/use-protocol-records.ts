import { useMemo, useSyncExternalStore } from "react";
import { readProtocolRecords } from "@/lib/field-protocol";

const storageKey = "terra-field-protocol-v1";
const emptySnapshot = "{}";

function subscribe(listener: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === storageKey || event.key === null) listener();
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function snapshot() {
  try {
    return localStorage.getItem(storageKey) ?? emptySnapshot;
  } catch {
    return emptySnapshot;
  }
}

export function useProtocolRecords() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => emptySnapshot);
  return useMemo(() => readProtocolRecords(raw), [raw]);
}
