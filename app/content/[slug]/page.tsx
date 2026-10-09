import { CommunityPage } from "@/components/CommunityPage";

export default async function CommunityRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CommunityPage slug={slug} />;
}
