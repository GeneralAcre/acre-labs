"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import type { CollectedClaim, ProfileRecord } from "@/lib/types";
import { ClaimGrid } from "@/components/ClaimGrid";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";
import { MyBadgeCodes } from "@/components/MyBadgeCodes";
import { ProfileEditor } from "@/components/ProfileEditor";
import { ProfileMemberCards } from "@/components/ProfileMemberCards";

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
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-4 py-3.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">{label}</span>
      <span className="font-heading font-bold text-xl leading-none tracking-tight text-foreground">{value}</span>
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
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

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

  useEffect(() => {
    if (isInvalidAddress) return;
    let cancelled = false;
    async function loadProfile() {
      const res = await fetch(`/api/profile?address=${routeAddress}`);
      const data = await res.json().catch(() => ({ profile: null }));
      if (!cancelled) setProfile(data.profile ?? null);
    }
    loadProfile();
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
  // A name the wallet set itself (Profile) always wins, for everyone viewing.
  const privyEmail = privy.user?.email?.address ?? privy.user?.google?.email ?? null;
  const isEmailName = isMe && (providerName === "Email" || providerName === "Google") && !!privyEmail;
  const hasName = !!profile?.displayName || isEmailName;
  const displayName =
    profile?.displayName ?? (isEmailName && privyEmail ? privyEmail : shortenAddress(routeAddress));

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
        <span className="brand-kicker text-muted-foreground">Collection</span>
        <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
          Invalid Wallet Address
        </h1>
        <p className="text-sm text-muted-foreground">
          &quot;{routeAddress}&quot; doesn&apos;t look like a valid Avalanche address.
        </p>
        <Link href="/badge" className="pill-light h-11 px-6 text-sm">
          Back to Badge
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="relative isolate mx-auto flex w-full max-w-[1400px] flex-col items-start overflow-hidden rounded-2xl border border-border bg-card px-4 py-5 text-left sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_90%_0%,rgba(60,131,246,0.16),transparent_55%)]" />
          {/* Avatar sits left of the name at every size — smaller on phones. */}
          <div className="flex w-full items-start gap-4 sm:items-center sm:gap-6">
            <div
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-card font-heading text-lg font-bold tracking-tight text-foreground sm:size-20 sm:rounded-2xl sm:text-2xl"
            >
              {routeAddress.slice(2, 4)}
            </div>

            <div className="flex min-w-0 max-w-full flex-1 flex-col items-start gap-2">
              <span className="brand-kicker text-muted-foreground">
                {isMe ? "Your Wallet" : "Collection"}
              </span>

              {hasName ? (
                <>
                  <h1 className="font-heading font-bold text-2xl leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl">
                    {displayName}
                  </h1>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
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
                  <h1 className="font-heading font-bold text-2xl leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl">
                    {displayName}
                  </h1>
                  <span className="text-muted-foreground/70 group-hover:text-foreground">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </span>
                </button>
              )}
              {profile?.xHandle && (
                <a
                  href={`https://x.com/${profile.xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  @{profile.xHandle}
                </a>
              )}
              {/* Keyed by the loaded profile so the editor's fields reset
                  once the profile fetch resolves. */}
              {isMe && <ProfileEditor key={profile?.address ?? "none"} profile={profile} onSaved={setProfile} />}
            </div>
          </div>

          {stage === "ready" && (
            <div className="mt-5 grid w-full grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-4 sm:gap-3">
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

      {isMe && <MyBadgeCodes />}

      <ProfileMemberCards xHandle={profile?.xHandle ?? null} isMe={isMe} />

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-10 sm:px-6">
        {stage === "loading" && (
          <p className="text-sm text-muted-foreground">Loading collection…</p>
        )}

        {stage === "ready" && claims.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {isMe ? "You haven't" : "This wallet hasn't"} claimed any drops yet.
          </p>
        )}

        {stage === "ready" && claims.length > 0 && (
          <>


            {visibleClaims.length === 0 && (
              <p className="text-sm text-muted-foreground">No badges match your search.</p>
            )}

            {visibleClaims.length > 0 && view === "grid" && (
              <>
                {groups ? (
                  <div className="flex flex-col gap-10">
                    {groups.map((group) => (
                      <div key={group.label} className="flex flex-col gap-4">
                        <h2 className="font-heading font-bold text-lg tracking-tight text-muted-foreground">
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
              <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
                {visibleClaims.map((claim) => (
                  <Link
                    key={`${claim.eventId}:${claim.txHash}`}
                    href={`/collection/${claim.txHash}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary"
                  >
                    <EventBadge title={claim.event.title} imageUrl={claim.event.imageUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                        {claim.event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(claim.claimedAt)}</p>
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
