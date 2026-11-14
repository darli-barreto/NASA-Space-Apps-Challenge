"use client";

import { createContext, useContext } from "react";
import type { Analysis, Site } from "@/lib/analysis";
import type { useDiscovery } from "./use-discovery";

export const DiscoveryContext = createContext<{
  discovery: ReturnType<typeof useDiscovery>;
  result: Analysis | null;
  saved: Analysis[];
  selectedId: number | undefined;
  selectCandidate: (id: number) => void;
  inspect: (site: Site, body: "Luna" | "Marte") => void;
} | null>(null);

export function useDiscoveryContext() {
  const context = useContext(DiscoveryContext);
  if (!context) throw new Error("DiscoveryContext must be provided by Workspace.");
  return context;
}
