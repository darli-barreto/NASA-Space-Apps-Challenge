import type { Metadata } from "next";
import Methodology from "@/components/methodology";

export const metadata: Metadata = { title: "Metodología · TERRA" };

export default function MethodologyPage() {
  return <Methodology />;
}
