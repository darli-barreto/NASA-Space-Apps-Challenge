import { notFound } from "next/navigation";
import CandidateDetail from "@/components/candidate-detail";
import { planetaryProfile } from "@/lib/planetary";
import { candidateName } from "@/lib/workspace-routes";

type Props = { params: Promise<{ reference: string; id: string }> };

async function readCandidate(params: Props["params"]) {
  const { reference, id } = await params;
  const profile = planetaryProfile(reference);
  if (!profile || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return { id: Number(id), profile };
}

export async function generateMetadata({ params }: Props) {
  const { id, profile } = await readCandidate(params);
  return { title: `${candidateName(id)} · ${profile.name} · TERRA` };
}

export default async function CandidatePage({ params }: Props) {
  const { id, profile } = await readCandidate(params);
  return <CandidateDetail key={`${profile.id}/${id}`} id={id} profileId={profile.id} />;
}
