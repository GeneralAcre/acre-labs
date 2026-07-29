import Link from "next/link";
import type { CollectedClaim } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";

export function ClaimGrid({ claims }: { claims: CollectedClaim[] }) {
  return (
    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {claims.map((claim) => (
        <Link
          key={`${claim.eventId}:${claim.txHash}`}
          href={`/collection/${claim.txHash}`}
          title={claim.event.title}
          className="group flex flex-col items-center gap-2"
        >
          <div className="relative">
            <EventBadge
              title={claim.event.title}
              imageUrl={claim.event.imageUrl}
              size={96}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md"
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[10rem] -translate-x-1/2 rounded-lg border border-brand-mist/10 bg-brand-ink px-3 py-1.5 text-xs font-medium text-brand-mist opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {claim.event.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
