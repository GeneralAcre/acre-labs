"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EventRecord } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useOwnerSession } from "@/lib/useOwnerSession";
import { useOrigin } from "@/lib/useOrigin";
import { useNow } from "@/lib/useNow";

type OrganizerEvent = EventRecord & { claimedCount: number };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Profile-page panel listing the badges this wallet created, with their
// secret claim codes. Only ever rendered on the viewer's own profile, and the
// codes themselves come from the owner-scoped GET /api/events, which needs a
// signed session — so nobody else's profile view can reveal them.
export function MyBadgeCodes() {
  const { sessionChecked, isAuthenticated, signingIn, authError, signIn } = useOwnerSession();
  const [events, setEvents] = useState<OrganizerEvent[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = useOrigin();
  const now = useNow();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/events");
      const data = res.ok ? await res.json() : { events: [] };
      const all: OrganizerEvent[] = data.events ?? [];
      if (!cancelled) setEvents(all.filter((event) => event.product === "badge"));
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  function copy(key: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
  }

  if (!sessionChecked) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span className="brand-kicker text-muted-foreground">Organizer</span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Your badges · claim codes</h2>
        </div>
        <Link
          href="/badge?tab=create#badge-tabs"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Create badge →
        </Link>
      </div>

      {!isAuthenticated ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Sign in with your wallet to see the claim codes for badges you created. One signature, no gas.
          </p>
          <button
            type="button"
            onClick={signIn}
            disabled={signingIn}
            className="pill-light h-10 shrink-0 px-4 text-sm disabled:opacity-50"
          >
            {signingIn ? "Check your wallet…" : "Show my codes"}
          </button>
          {authError && <p className="text-sm text-brand-red">{authError}</p>}
        </div>
      ) : events === null ? (
        <p className="text-sm text-muted-foreground">Loading your badges…</p>
      ) : events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          You haven&apos;t created any badges yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const closed = now !== null && now > event.expiresAt;
            const claimUrl = `${origin}/claim/${event.slug}`;
            return (
              <div key={event.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <EventBadge title={event.title} imageUrl={event.imageUrl} size={44} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{event.title}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {event.claimedCount}
                      {typeof event.maxSupply === "number" ? ` / ${event.maxSupply}` : ""} claimed ·{" "}
                      {closed ? "closed" : "closes"} {formatDate(event.expiresAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      closed ? "bg-brand-red text-white" : "bg-[#21c45d]/15 text-[#21c45d]"
                    }`}
                  >
                    {closed ? "Closed" : "Open"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-md bg-brand-mist px-3 py-2 text-center font-mono text-base font-bold tracking-[0.3em] text-brand-ink">
                    {event.secretCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(`code:${event.id}`, event.secretCode)}
                    className="pill-outline-light h-10 px-3 text-xs font-medium"
                  >
                    {copied === `code:${event.id}` ? "Copied!" : "Copy code"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => copy(`link:${event.id}`, claimUrl)}
                  className="pill-outline-light h-9 px-3 text-xs font-medium"
                >
                  {copied === `link:${event.id}` ? "Link copied!" : "Copy claim link"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
