"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import type { CollectedClaim } from "@/lib/types";
import { ClaimGrid } from "@/components/ClaimGrid";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function monthLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 3.5H14M2 8H14M2 12.5H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="5.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 10.5V2.5C3 1.94772 3.44772 1.5 4 1.5H11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 border border-brand-mist/15 bg-brand-surface px-4 py-3.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-brand-mist/45">{label}</span>
      <span className="font-heading text-xl leading-none tracking-tight text-brand-mist">{value}</span>
    </div>
  );
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

type Stage = "loading" | "ready";
type SortKey = "date" | "title";
type ViewMode = "grid" | "list";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: routeAddress } = use(params);
  const { address: myAddress, providerName } = useWallet();
  const privy = usePrivy();
  const [claims, setClaims] = useState<CollectedClaim[]>([]);
  const [stage, setStage] = useState<Stage>("loading");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [copied, setCopied] = useState(false);

  // Validity is a pure function of the route param, not fetched state — no
  // effect needed to derive it, unlike the claims list below.
  const isInvalidAddress = !ADDRESS_RE.test(routeAddress);

  useEffect(() => {
    if (isInvalidAddress) return;

    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/claims?address=${routeAddress}`);
      const data = await res.json();
      if (!cancelled) {
        setClaims(data.claims ?? []);
        setStage("ready");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [routeAddress, isInvalidAddress]);

  const isMe = !!myAddress && myAddress.toLowerCase() === routeAddress.toLowerCase();

  // Prefer whatever identity Privy actually has for the signed-in session
  // (only meaningful for "me" — we have no access to another wallet's Privy
  // account) over a bare address, since an email reads as a name and an
  // address doesn't. Falls back to the address for everyone else, and for
  // "me" whenever the connection isn't a Privy/email session.
  const isEmailName = isMe && providerName === "Email" && !!privy.user?.email?.address;
  const displayName = isEmailName ? privy.user!.email!.address! : shortenAddress(routeAddress);

  const earliestClaimedAt = useMemo(
    () => (claims.length ? Math.min(...claims.map((c) => c.claimedAt)) : null),
    [claims]
  );

  const latestClaimedAt = useMemo(
    () => (claims.length ? Math.max(...claims.map((c) => c.claimedAt)) : null),
    [claims]
  );

  const productCounts = useMemo(() => {
    let badge = 0;
    let content = 0;
    for (const c of claims) {
      if (c.event.product === "badge") badge += 1;
      else content += 1;
    }
    return { badge, content };
  }, [claims]);

  function copyAddress() {
    navigator.clipboard.writeText(routeAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const visibleClaims = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? claims.filter((c) => c.event.title.toLowerCase().includes(needle))
      : claims;

    return [...filtered].sort((a, b) => {
      const cmp =
        sortKey === "date"
          ? a.claimedAt - b.claimedAt
          : a.event.title.localeCompare(b.event.title);
      return sortDesc ? -cmp : cmp;
    });
  }, [claims, query, sortKey, sortDesc]);

  // Grouping by calendar month only reads as "recent activity" when the list
  // is chronological — sorting by name would scatter one month's badges
  // across several unrelated headers.
  const groups = useMemo(() => {
    if (sortKey !== "date") return null;
    const map = new Map<string, { label: string; items: CollectedClaim[] }>();
    for (const claim of visibleClaims) {
      const key = monthKey(claim.claimedAt);
      if (!map.has(key)) map.set(key, { label: monthLabel(claim.claimedAt), items: [] });
      map.get(key)?.items.push(claim);
    }
    return Array.from(map.values());
  }, [visibleClaims, sortKey]);

  if (isInvalidAddress) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">Collection</span>
        <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
          Invalid Wallet Address
        </h1>
        <p className="text-sm text-brand-mist/60">
          &quot;{routeAddress}&quot; doesn&apos;t look like a valid Avalanche address.
        </p>
        <Link href="/collection" className="pill-dark h-11 px-6 text-sm font-medium">
          Back to Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-background pt-16 pb-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start px-4 text-left">
          <div className="flex w-full flex-col gap-6 sm:flex-row sm:items-center">
            <Link
              href="/collection"
              className="pill-light inline-flex h-9 shrink-0 items-center gap-1.5 px-4 text-xs font-medium"
            >
              Back
            </Link>

            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center border border-brand-mist/20 bg-brand-surface font-heading text-2xl uppercase tracking-tight text-brand-mist"
            >
              {routeAddress.slice(2, 4)}
            </div>

            <div className="flex flex-1 flex-col items-start gap-2">
              <span className="brand-kicker text-brand-mist/50">
                {isMe ? "Your Wallet" : "Collection"}
              </span>

              {isEmailName ? (
                <>
                  <h1 className="font-heading text-4xl leading-none tracking-tight text-brand-mist">
                    {displayName}
                  </h1>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1.5 font-mono text-xs text-brand-mist/60 hover:text-brand-mist"
                    title="Copy full address"
                  >
                    {shortenAddress(routeAddress)}
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </>
              ) : (
                <button
                  onClick={copyAddress}
                  title="Copy full address"
                  className="group flex items-center gap-2"
                >
                  <h1 className="font-heading text-4xl leading-none tracking-tight text-brand-mist">
                    {displayName}
                  </h1>
                  <span className="text-brand-mist/40 group-hover:text-brand-mist">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </span>
                </button>
              )}
            </div>
          </div>

          {stage === "ready" && (
            <div className="mt-8 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              <StatCard label="Badges" value={String(claims.length)} />
              <StatCard
                label="Member Since"
                value={earliestClaimedAt ? formatDate(earliestClaimedAt) : "—"}
              />
              <StatCard
                label="Latest Claim"
                value={latestClaimedAt ? formatDate(latestClaimedAt) : "—"}
              />
              <StatCard
                label="Products"
                value={
                  claims.length === 0
                    ? "—"
                    : `${productCounts.badge} Badge${productCounts.content ? ` · ${productCounts.content} Content` : ""}`
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        {stage === "loading" && (
          <p className="text-sm text-brand-mist/60">Loading collection…</p>
        )}

        {stage === "ready" && claims.length === 0 && (
          <p className="text-sm text-brand-mist/60">
            {isMe ? "You haven't" : "This wallet hasn't"} claimed any drops yet.
          </p>
        )}

        {stage === "ready" && claims.length > 0 && (
          <>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your badges"
                className="h-11 w-full max-w-xs rounded-lg border border-brand-mist/15 bg-brand-surface px-4 text-sm text-brand-mist placeholder:text-brand-mist/30 focus:border-brand-mist/40 focus:outline-none"
              />

              <div className="flex items-center gap-2">
                <label htmlFor="sortKey" className="text-xs text-brand-mist/50">
                  Order by
                </label>
                <select
                  id="sortKey"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="h-9 rounded-lg border border-brand-mist/15 bg-brand-surface px-3 text-xs text-brand-mist focus:outline-none"
                >
                  <option value="date">Claim Date</option>
                  <option value="title">Name</option>
                </select>
                <button
                  onClick={() => setSortDesc((d) => !d)}
                  aria-label="Toggle sort direction"
                  className="flex h-9 items-center justify-center rounded-lg border border-brand-mist/15 px-3 text-xs font-medium text-brand-mist hover:bg-brand-ink"
                >
                  {sortDesc ? "Desc" : "Asc"}
                </button>
                <div className="flex overflow-hidden rounded-lg border border-brand-mist/15">
                  <button
                    onClick={() => setView("grid")}
                    aria-label="Grid view"
                    className={`flex h-9 w-9 items-center justify-center ${
                      view === "grid" ? "bg-brand-ink text-brand-mist" : "text-brand-mist/40 hover:text-brand-mist"
                    }`}
                  >
                    <GridIcon />
                  </button>
                  <button
                    onClick={() => setView("list")}
                    aria-label="List view"
                    className={`flex h-9 w-9 items-center justify-center ${
                      view === "list" ? "bg-brand-ink text-brand-mist" : "text-brand-mist/40 hover:text-brand-mist"
                    }`}
                  >
                    <ListIcon />
                  </button>
                </div>
              </div>
            </div>

            {visibleClaims.length === 0 && (
              <p className="text-sm text-brand-mist/60">No badges match your search.</p>
            )}

            {visibleClaims.length > 0 && view === "grid" && (
              <>
                {groups ? (
                  <div className="flex flex-col gap-10">
                    {groups.map((group) => (
                      <div key={group.label} className="flex flex-col gap-4">
                        <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist/70">
                          {group.label}
                        </h2>
                        <ClaimGrid claims={group.items} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ClaimGrid claims={visibleClaims} />
                )}
              </>
            )}

            {visibleClaims.length > 0 && view === "list" && (
              <div className="flex flex-col divide-y divide-brand-mist/10 rounded-xl border border-brand-mist/10 bg-brand-surface shadow-sm">
                {visibleClaims.map((claim) => (
                  <Link
                    key={`${claim.eventId}:${claim.txHash}`}
                    href={`/collection/${claim.txHash}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-ink"
                  >
                    <EventBadge title={claim.event.title} imageUrl={claim.event.imageUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-mist">
                        {claim.event.title}
                      </p>
                      <p className="text-xs text-brand-mist/50">{formatDate(claim.claimedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
