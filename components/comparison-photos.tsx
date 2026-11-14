import { useTranslations } from "next-intl";
import { Message } from "@/components/message";
import ComparisonPhoto, { type PhotoSite } from "./comparison-photo";

const km = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

export default function ComparisonPhotos({ earth, planet, spacingKm }: {
  earth: PhotoSite;
  planet: PhotoSite;
  spacingKm: number;
}) {
  const translate = useTranslations();
  return (
    <figure className="mx-auto my-4 max-w-3xl border-y border-slate-200 py-3">
      <figcaption className="mb-2 text-sm font-semibold">{translate("terrainImagery")}</figcaption>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <ComparisonPhoto key={earth.label} site={earth} spacingKm={spacingKm} />
        <ComparisonPhoto key={planet.label} site={planet} spacingKm={spacingKm} />
      </div>
      <p className="mt-2 text-xs">
        <Message id="window" /> {km.format(2 * spacingKm)} × {km.format(2 * spacingKm)} <Message id="kmInnerRadius" /> {km.format(spacingKm)} km.
      </p>
    </figure>
  );
}
