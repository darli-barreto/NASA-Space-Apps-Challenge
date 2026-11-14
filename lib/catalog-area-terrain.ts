import archive from "@/data/catalog-area-terrain.json";
import pilot from "@/data/pilot-area-terrain.json";

export function candidateArea(site: { id: number; lat: number; lon: number }, profileId: string) {
  const archived = archive.sites[String(site.id) as keyof typeof archive.sites];
  const reference = archive.references[profileId as keyof typeof archive.references];
  if (!archived || !reference || Math.abs(archived.lat - site.lat) > 1e-6 ||
      Math.abs(archived.lon - site.lon) > 1e-6) return null;

  return site.id === pilot.candidateId && profileId === pilot.referenceId
    ? { products: pilot.products, disagreement: pilot.uncertainty.earthProductDisagreement }
    : { products: [archived.product, reference], disagreement: null };
}
