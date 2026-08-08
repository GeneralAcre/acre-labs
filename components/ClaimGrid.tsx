import Link from "next/link";
import type { CollectedClaim } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";

export function ClaimGrid({ claims }: { claims: CollectedClaim[] }) {
  return (
    <div className="grid grid-cols-2 justify-items-start gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
      {claims.map((claim) => (
        <Link
          key={`${claim.eventId}:${claim.txHash}`}
          href={`/collection/${claim.txHash}`}
          title={claim.event.title}
          className="group flex flex-col items-center gap-2"
        >
          <div className="relative aspect-square w-28 sm:w-32 lg:w-36">
            <div className="relative h-full w-full overflow-hidden rounded-full ring-1 ring-brand-mist/25 transition-shadow duration-300 group-hover:ring-2 group-hover:ring-brand-mist/70 group-hover:shadow-[0_0_18px_rgba(255,255,255,0.4)]">
              <EventBadge
                title={claim.event.title}
                imageUrl={claim.event.imageUrl}
                size={220}
                className="!h-full !w-full transition-transform group-hover:-translate-y-0.5"
              />
              {/* Diagonal highlight swept across on hover via the group-hover
                  translate — clipped to the circle by overflow-hidden above. */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            </div>
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[10rem] -translate-x-1/2 rounded-lg border border-brand-mist/10 bg-brand-ink px-3 py-1.5 text-xs font-medium text-brand-mist opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {claim.event.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
