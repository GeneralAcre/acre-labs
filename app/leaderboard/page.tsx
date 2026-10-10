"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";
import { Identicon } from "@/components/Identicon";
import { useWallet } from "@/components/WalletProvider";

// Podium accents: red, orange, gold.
const RANK_COLORS = ["#d62828", "#e85d04", "#ffba08"];

const LEVEL_COLORS: Record<string, string> = {
  Legend: "#f6c65b",
  Collector: "#93c5fd",
  Explorer: "#67e8f9",
  Newcomer: "#a1a1a1",
};

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function nameOf(entry: LeaderboardEntry): string {
  return entry.displayName ?? shortenAddress(entry.address);
}

function pad(rank: number): string {
  return String(rank).padStart(2, "0");
}

function LevelMark({ name, level, size = "md" }: { name: string; level: number; size?: "sm" | "md" }) {
  const color = LEVEL_COLORS[name] ?? "#a1a1a1";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`grid shrink-0 rotate-45 place-items-center border bg-background/70 ${
          size === "sm" ? "h-6 w-6 rounded-[7px]" : "h-8 w-8 rounded-[9px]"
        }`}
        style={{ borderColor: `${color}66`, boxShadow: `0 0 18px ${color}18` }}
      >
        <span className="-rotate-45 text-[10px] font-bold tabular-nums" style={{ color }}>
          {level}
        </span>
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-semibold ${size === "sm" ? "text-xs" : "text-sm"}`} style={{ color }}>
          {name}
        </span>
        {size === "md" && (
          <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Level {pad(level)}</span>
        )}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const { address } = useWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/leaderboard");
      const data = await res.json().catch(() => ({ entries: [] }));
      if (!cancelled) setEntries(data.entries ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const mine = address && entries ? entries.find((e) => e.address === address.toLowerCase()) : undefined;
  const podium = entries?.slice(0, 3) ?? [];

  return (
    <main className="relative flex-1 overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] opacity-40 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-b from-white via-white to-white/55 bg-clip-text pb-0.5 text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              Leaderboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              10 pts per badge claimed · 5 pts per community member card
            </p>
          </div>
          <Link
            href="/badge"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground transition hover:text-white/65"
          >
            Earn more points <ArrowRight className="size-4" />
          </Link>
        </header>

        {/* Your standing */}
        <section className="relative isolate overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d] p-5 sm:p-7">
          {mine ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="shrink-0 border-r border-white/10 pr-4 sm:pr-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your rank</p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.06em] sm:text-5xl">#{pad(mine.rank)}</p>
                </div>
                <Identicon tone="dark" address={mine.address} size={56} className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold [overflow-wrap:anywhere]">{nameOf(mine)}</p>
                  <div className="mt-2">
                    <LevelMark name={mine.name} level={mine.level} size="sm" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-4 lg:min-w-[380px] lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                <Stat label="Points" value={mine.points.toLocaleString()} />
                <Stat label="Badges" value={String(mine.badges)} />
                <Stat label="Member cards" value={String(mine.memberCards)} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your standing</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {address ? "You're not ranked yet" : "See where you rank"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {address
                    ? "Claim a badge, or add your X handle on your profile to count your member cards, to get on the board."
                    : "Connect your wallet to see your rank."}
                </p>
              </div>
              {address && (
                <Link href="/badge" className="pill-light h-11 shrink-0 px-5 text-sm">
                  Claim a badge
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Podium */}
        {podium.length > 0 && (
          <section className="grid grid-cols-1 items-end gap-3 py-9 sm:grid-cols-3 sm:gap-4 lg:py-12">
            {podium.map((entry, i) => {
              const color = RANK_COLORS[i];
              const order = i === 0 ? "order-1 sm:order-2 sm:min-h-[320px]" : i === 1 ? "order-2 sm:order-1 sm:min-h-[270px]" : "order-3 sm:min-h-[270px]";
              return (
                <Link
                  key={entry.address}
                  href={`/profile/${entry.address}`}
                  className={`group relative flex min-h-[220px] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d] p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-white/20 sm:p-6 ${order}`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
                  <div className="pointer-events-none absolute -right-2 -top-6 text-[130px] font-black leading-none tracking-[-0.12em] text-white/[0.035]">
                    {pad(entry.rank)}
                  </div>
                  <div className="relative flex items-start justify-between">
                    <span className="text-5xl font-semibold tabular-nums tracking-[-0.08em] sm:text-7xl" style={{ color }}>
                      {pad(entry.rank)}
                    </span>
                    <span className="mt-1 h-2 w-2 rotate-45 border" style={{ borderColor: color }} />
                  </div>
                  <div className="relative mt-auto flex items-center gap-3">
                    <Identicon
                      tone="dark"
                      address={entry.address}
                      size={64}
                      className={i === 0 ? "shadow-[0_0_0_4px_rgba(214,40,40,.07)] ring-1 ring-[#d62828]/45" : ""}
                    />
                    <div className="min-w-0">
                      <p className="text-base font-semibold [overflow-wrap:anywhere] sm:text-lg">{nameOf(entry)}</p>
                      <div className="mt-2">
                        <LevelMark name={entry.name} level={entry.level} size="sm" />
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-5 flex items-end justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className={`font-semibold tabular-nums tracking-[-0.035em] ${i === 0 ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
                        {entry.points.toLocaleString()}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        Points · {entry.badges} badge{entry.badges === 1 ? "" : "s"}
                      </p>
                    </div>
                    {i === 0 && (
                      <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d62828] sm:block">
                        Top collector
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Full standings */}
        <section className={`overflow-hidden rounded-[22px] border border-white/10 bg-[#0d0d0d] ${podium.length === 0 ? "mt-9" : ""}`}>
          <div className="border-b border-white/10 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-semibold sm:text-xl">Full standings</h2>
            <p className="mt-1 text-xs text-muted-foreground">Badges collected and member cards across AcreLabs</p>
          </div>
          <div className="hidden grid-cols-[60px_minmax(0,1fr)_170px_90px_110px] border-b border-white/10 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:grid">
            <span>Rank</span>
            <span>Member</span>
            <span>Level</span>
            <span className="text-right">Badges</span>
            <span className="text-right">Points</span>
          </div>

          {entries === null && (
            <div className="space-y-px">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[76px] animate-pulse border-b border-white/[0.07] bg-white/[0.02] motion-reduce:animate-none" />
              ))}
            </div>
          )}

          {entries?.length === 0 && (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No one&apos;s on the board yet — claim a badge to be first.</p>
          )}

          {entries?.map((entry) => {
            const isMine = !!address && entry.address === address.toLowerCase();
            return (
              <Link
                key={entry.address}
                href={`/profile/${entry.address}`}
                className={`grid grid-cols-[46px_minmax(0,1fr)_auto] items-center border-b border-white/[0.07] px-4 py-4 transition last:border-0 hover:bg-white/[0.035] sm:grid-cols-[60px_minmax(0,1fr)_170px_90px_110px] sm:px-6 ${
                  isMine ? "bg-[#3c83f6]/[0.06]" : ""
                }`}
              >
                <span className="text-lg font-semibold tabular-nums" style={{ color: RANK_COLORS[entry.rank - 1] ?? "#a1a1a1" }}>
                  {pad(entry.rank)}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <Identicon tone="dark" address={entry.address} size={44} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold sm:text-base">
                      <span className="min-w-0 [overflow-wrap:anywhere]">{nameOf(entry)}</span>
                      {isMine && <span className="rounded bg-[#3c83f6]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#93c5fd]">You</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {entry.xHandle ? `@${entry.xHandle}` : shortenAddress(entry.address)}
                      {entry.memberCards > 0 && ` · ${entry.memberCards} member card${entry.memberCards === 1 ? "" : "s"}`}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground [overflow-wrap:anywhere] sm:hidden">
                      {entry.name} · {entry.badges} badge{entry.badges === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <LevelMark name={entry.name} level={entry.level} />
                </div>
                <span className="hidden text-right text-base tabular-nums text-muted-foreground sm:block">{entry.badges}</span>
                <div className="text-right">
                  <span className="text-base font-semibold tabular-nums sm:text-lg">{entry.points.toLocaleString()}</span>
                  <span className="ml-1 hidden text-[10px] uppercase tracking-[.12em] text-muted-foreground lg:inline">pts</span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 text-center">
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  );
}
