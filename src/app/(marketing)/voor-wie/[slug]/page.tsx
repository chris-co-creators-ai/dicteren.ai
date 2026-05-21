import { notFound } from "next/navigation";
import { AudienceLanding } from "@/components/marketing/audience-landing";
import { AUDIENCES, AUDIENCE_LIST, type AudienceSlug } from "@/lib/audiences";

export function generateStaticParams() {
  return AUDIENCE_LIST.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audience = AUDIENCES[slug as AudienceSlug];
  if (!audience) return { title: "Voor wie" };
  return {
    title: audience.chip,
    description: audience.intro,
  };
}

export default async function VoorWieDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audience = AUDIENCES[slug as AudienceSlug];
  if (!audience) notFound();
  return <AudienceLanding audience={audience} />;
}
