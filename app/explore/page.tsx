"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CollectorSummary } from "@/lib/store";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [collectors, setCollectors] = useState<CollectorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/collectors");
      const data = await res.json();
      if (!cancelled) {
        setCollectors(data.collectors ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(e: FormEvent) {
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
        <span className="brand-kicker text-brand-mist/80">Explore</span>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-tight text-brand-mist">
          See Other Collections
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-mist/90">
          Look up any wallet address to view the drops they&apos;ve claimed on
          Avalanche.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x…"
            className="h-12 flex-1 rounded-lg border border-brand-mist/40 bg-brand-mist/10 px-4 font-mono text-sm text-brand-mist placeholder:text-brand-mist/40"
          />
          <button type="submit" className="pill-light h-12 px-6 text-sm font-medium">
            View Profile
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-brand-mist">{error}</p>}
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
          Recent Collectors
        </h2>

        {loading && <p className="mt-4 text-sm text-brand-mist/60">Loading…</p>}

        {!loading && collectors.length === 0 && (
          <p className="mt-4 text-sm text-brand-mist/60">
            No one has claimed a drop yet.
          </p>
        )}

        {collectors.length > 0 && (
          <div className="mt-4 flex flex-col divide-y divide-brand-mist/10 rounded-xl border border-brand-mist/10 bg-brand-surface shadow-sm">
            {collectors.map((collector) => (
              <Link
                key={collector.walletAddress}
                href={`/profile/${collector.walletAddress}`}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-brand-mist/40"
              >
                <span className="font-mono text-sm text-brand-mist">
                  {shortenAddress(collector.walletAddress)}
                </span>
                <span className="text-xs text-brand-mist/50">
                  {collector.dropCount} drop{collector.dropCount === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
