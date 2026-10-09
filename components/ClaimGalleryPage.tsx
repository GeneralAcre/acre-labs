"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product, PublicEvent } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useNow } from "@/lib/useNow";

// Each product's claim gallery/detail pair lives under its own route prefix.
const CLAIM_BASE_PATH: Record<Product, string> = {
  badge: "/claim",
  content: "/content/claim",
};

const COPY: Record<Product, { kicker: string; title: string; subtitle: string; empty: string }> = {
  badge: {
    kicker: "An Acre Labs Project",
    title: "Badge",
    subtitle: "Find the event you attended, then enter its code to claim your badge on-chain.",
    empty: "No drops yet. Check back once an organizer creates one.",
  },
  content: {
    kicker: "An Acre Labs Project",
    title: "Content",
    subtitle: "Find the hackathon you're joining, then enter its code to mint your passport.",
    empty: "No hackathons yet. Check back once one is announced.",
  },
};

type Filter = "all" | "open" | "closed";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ClaimGalleryPage({ product, showHero = true }: { product: Product; showHero?: boolean }) {
  const copy = COPY[product];
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/events/public?product=${product}`);
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
  }, [product]);

  const [filter, setFilter] = useState<Filter>("all");
  const openCount = now === null ? null : events.filter((e) => e.expiresAt > now).length;
  const visibleEvents =
    filter === "all" || now === null
      ? events
      : events.filter((e) => (filter === "open" ? e.expiresAt > now : e.expiresAt <= now));

  return (
    <div className="flex flex-1 flex-col bg-background">
      {showHero && (
      <section className="px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-card px-5 py-10 sm:px-8 sm:py-12">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_0%,rgba(60,131,246,0.18),transparent_60%)]" />
            <span className="brand-kicker text-muted-foreground">{copy.kicker}</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.subtitle}</p>
            {!loading && events.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">
                  {events.length} total
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-foreground">
                  {openCount ? <span className="live-dot" aria-hidden="true" /> : null}
                  {openCount ?? "…"} open now
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      <section id="drops" className="flex-1 scroll-mt-20 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {showHero ? "Drops" : "Claim your badge"}
            </h2>
            {!showHero && !loading && events.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                {openCount ? <span className="live-dot" aria-hidden="true" /> : null}
                {openCount ?? "…"} open · {events.length} total
              </span>
            )}
          </div>
          <div aria-label="Filter drops" className="mb-4 flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`min-h-10 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                  filter === f.value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading && (
            <div aria-label="Loading drops" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
              ))}
            </div>
          )}

          {!loading && visibleEvents.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              {events.length === 0 ? copy.empty : "Nothing here right now."}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {visibleEvents.map((event) => {
              const closed = now !== null && now > event.expiresAt;
              return (
                <Link
                  key={event.id}
                  href={`${CLAIM_BASE_PATH[product]}/${event.slug}`}
                  title={event.title}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
                >
                  <div className="relative flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1f1f1f,#0a0a0a_75%)] p-6">
                    <EventBadge
                      title={event.title}
                      imageUrl={event.imageUrl}
                      size={220}
                      className="!h-full !w-full shadow-2xl shadow-black/60 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span
                      className={`absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        closed ? "bg-brand-red text-white" : "bg-[#21c45d]/15 text-[#21c45d]"
                      }`}
                    >
                      {closed ? "Closed" : "Open"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-border p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{event.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {event.location ? `${event.location} · ` : ""}
                      {formatDate(event.eventEndTime)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
