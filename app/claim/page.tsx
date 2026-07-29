"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicEvent } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useNow } from "@/lib/useNow";

export default function ClaimGalleryPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/events/public");
      const data = await res.json();
      if (!cancelled) {
        setEvents(data.events ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="brand-gradient flex flex-col items-center px-6 pt-20 pb-14 text-center">
        <span className="brand-kicker text-brand-mist/80">Attendee Access</span>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-tight text-brand-mist">
          Claim Your Drop
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-mist/90">
          Tap the drop you attended, then enter the 6-digit code shown at the
          venue to claim your NFT on-chain.
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {loading && <p className="text-sm text-brand-mist/60">Loading drops…</p>}

        {!loading && events.length === 0 && (
          <p className="text-sm text-brand-mist/60">
            No drops yet. Check back once an organizer creates one.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {events.map((event) => {
            const closed = now !== null && now > event.expiresAt;
            return (
              <Link
                key={event.id}
                href={`/claim/${event.slug}`}
                title={event.title}
                className="group flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <EventBadge
                    title={event.title}
                    imageUrl={event.imageUrl}
                    size={96}
                    className={`transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md ${
                      closed ? "opacity-50" : ""
                    }`}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[10rem] -translate-x-1/2 rounded-lg bg-brand-ink px-3 py-1.5 text-xs font-medium text-brand-mist opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {event.title}
                    {closed ? " — Claim closed" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
