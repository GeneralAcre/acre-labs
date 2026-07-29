"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PublicEvent } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useNow } from "@/lib/useNow";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export default function CollectionPage() {
  const router = useRouter();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const address = query.trim();

    if (!ADDRESS_RE.test(address)) {
      setError("Enter a valid wallet address (0x…).");
      return;
    }

    setError(null);
    router.push(`/profile/${address}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="brand-gradient flex flex-col items-center px-6 pt-20 pb-14 text-center">
        <span className="brand-kicker text-brand-mist/80">Every Drop</span>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-tight text-brand-mist">
          Collection
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-mist/90">
          Every event NFT badge ever created on AcreLabs.
        </p>

        <form
          onSubmit={handleSearch}
          className="mt-8 flex w-full max-w-md flex-row gap-2 sm:gap-3"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a wallet address (0x…)"
            className="h-11 min-w-0 flex-1 rounded-lg border border-brand-mist/40 bg-brand-mist/10 px-3 font-mono text-xs text-brand-mist placeholder:text-brand-mist/40 sm:h-12 sm:px-4 sm:text-sm"
          />
          <button
            type="submit"
            className="pill-light h-11 shrink-0 px-4 text-xs font-medium sm:h-12 sm:px-6 sm:text-sm"
          >
            View Profile
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-brand-mist">{error}</p>}
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {loading && <p className="text-sm text-brand-mist/60">Loading badges…</p>}

        {!loading && events.length === 0 && (
          <p className="text-sm text-brand-mist/60">
            No badges yet. Check back once an organizer creates a drop.
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-5">
          {events.map((event) => {
            const closed = now !== null && now > event.expiresAt;
            return (
              <Link
                key={event.id}
                href={`/drop/${event.slug}`}
                title={event.title}
                className="group flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div className="relative overflow-hidden rounded-full ring-1 ring-brand-mist/25 transition-shadow duration-300 group-hover:ring-2 group-hover:ring-brand-mist/70 group-hover:shadow-[0_0_18px_rgba(255,255,255,0.4)]">
                    <EventBadge
                      title={event.title}
                      imageUrl={event.imageUrl}
                      size={96}
                      className={`transition-transform group-hover:-translate-y-0.5 ${
                        closed ? "opacity-50" : ""
                      }`}
                    />
                    {/* Diagonal highlight swept across on hover via the
                        group-hover translate — clipped to the circle by the
                        wrapper's overflow-hidden. */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  </div>
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
