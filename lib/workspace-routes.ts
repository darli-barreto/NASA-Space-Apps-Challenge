export const workspaceWidth = "mx-auto w-full max-w-[1640px] px-3 sm:px-4 lg:px-8";

export const workspaceRoutes = {
  Descubrir: "/",
  Explorar: "/map",
  Comparar: "/compare",
  Datos: "/data",
  Metodología: "/methodology",
  Resultados: "/map/results",
} as const;

export function candidateHref(profile: string, id: number) {
  return `/analogs/${profile}/${id}`;
}

export function candidateName(id: number) {
  return id === 55742 ? "Andagua" : `INGEMMET #${id}`;
}
