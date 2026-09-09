import { ClaimEventPage } from "@/components/ClaimEventPage";

export default function ContentClaimEventRoute({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return <ClaimEventPage product="content" params={params} />;
}
