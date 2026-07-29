"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { PublicEventWithSupply } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { addressExplorerUrl } from "@/lib/web3/chains";
import { useNow } from "@/lib/useNow";

function shortDropId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

type Stage = "loading" | "not_found" | "ready";

// Public detail view for a drop template itself — how many badges it minted,
// when its claim window ran, who deployed it — distinct from /claim/[slug]
// (the code-entry flow) and /collection/[txHash] (one attendee's receipt).
export default function DropDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [event, setEvent] = useState<PublicEventWithSupply | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [copied, setCopied] = useState(false);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/events/${slug}`);
      if (cancelled) return;

      if (!res.ok) {
        setStage("not_found");
        return;
      }

      const data = await res.json();
      setEvent(data.event);
      setStage("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/drop/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (stage === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-brand-mist/60">Loading…</p>
      </div>
    );
  }

  if (stage === "not_found" || !event) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">Collection</span>
        <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
          Drop Not Found
        </h1>
        <p className="text-sm text-brand-mist/60">
          This drop doesn&apos;t exist or the link is incorrect.
        </p>
        <Link href="/collection" className="pill-dark h-11 px-6 text-sm font-medium">
          Back to Collection
        </Link>
      </div>
    );
  }

  const closed = now !== null && now > event.expiresAt;
  const soldOut = typeof event.maxSupply === "number" && event.claimedCount >= event.maxSupply;

  return (
    <div className="flex flex-1 flex-col">
      {/* Short decorative banner — the badge card and content below float over
          it via negative margin, same pattern as the claim-receipt page. */}
      <div className="brand-gradient h-40 sm:h-48" />

      <div className="mx-auto -mt-28 w-full max-w-5xl flex-1 px-6 pb-16 sm:-mt-32">
        <Link
          href="/collection"
          className="pill-light mb-6 inline-flex h-9 items-center gap-1.5 px-4 text-xs font-medium"
        >
          Back to Collection
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-mist/10 bg-brand-surface p-8 text-center shadow-sm">
            <EventBadge title={event.title} imageUrl={event.imageUrl} size={220} />
            <span
              className={`pill-outline-light inline-flex h-9 items-center px-4 text-xs font-medium ${
                closed || soldOut ? "text-brand-red" : "text-brand-mist/70"
              }`}
            >
              {closed ? "Claim window closed" : soldOut ? "Sold out" : "Claim open"}
            </span>
          </div>

          <div className="flex flex-col gap-5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-brand-mist/40">
                <span>
                  Drop <span className="text-brand-mist">#{shortDropId(event.id)}</span>
                </span>
                <span>/</span>
                <Link
                  href={`/claim/${event.slug}`}
                  className="normal-case tracking-normal text-brand-red hover:underline"
                >
                  View Claim Page
                </Link>
              </div>
              <button
                onClick={copyLink}
                className="pill-outline-light h-8 px-3 text-xs font-medium text-brand-mist"
              >
                {copied ? "Link copied!" : "Share"}
              </button>
            </div>

            <h1 className="font-heading text-3xl uppercase leading-tight tracking-tight text-brand-mist sm:text-4xl">
              {event.title}
            </h1>

            {event.location && (
              <p className="text-sm text-brand-mist/60">{event.location}</p>
            )}

            {event.description && (
              <p className="max-w-xl text-sm text-brand-mist/80">{event.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Supply</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">
                  {typeof event.maxSupply === "number" ? event.maxSupply : "Unlimited"}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Claimed</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">{event.claimedCount}</p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Event Ended</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">
                  {formatDate(event.eventEndTime)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Claim Closes</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">
                  {formatDate(event.expiresAt)}
                </p>
              </div>
            </div>

            <a
              href={addressExplorerUrl(event.contractAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm hover:bg-brand-ink"
            >
              <span className="text-xs text-brand-mist/50">Contract · View on SnowTrace</span>
              <p className="mt-1 break-all font-mono text-sm font-medium text-brand-mist">
                {event.contractAddress}
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
