export const workspaceWidth = "mx-auto w-full max-w-[1640px] px-3 sm:px-4 lg:px-8";

export const workspaceRoutes = {
  Descubrir: "/",
  Explorar: "/mapa",
  Comparar: "/comparar",
  Datos: "/datos",
  Metodología: "/metodologia",
  Resultados: "/mapa/resultados",
} as const;

export function candidateHref(profile: string, id: number) {
  return `/analogos/${profile}/${id}`;
}

export function candidateName(id: number) {
  return id === 55742 ? "Andagua" : `INGEMMET #${id}`;
}
