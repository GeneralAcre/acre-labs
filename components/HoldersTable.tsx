"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { BadgeHolder } from "@/lib/types";
import { Identicon } from "@/components/Identicon";
import { addressExplorerUrl, txExplorerUrl } from "@/lib/web3/chains";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

// Everyone who minted this badge, read from the chain (the same mints
// Snowtrace lists for the contract).
export function HoldersTable({ eventId, contractAddress }: { eventId: string; contractAddress: string }) {
  const [holders, setHolders] = useState<BadgeHolder[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/events/${eventId}/holders`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setHolders(data.holders ?? []);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Holders</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {holders ? `${holders.length} minted · ` : ""}read from the chain
          </p>
        </div>
        <a
          href={addressExplorerUrl(contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View contract on Snowtrace <ExternalLink className="size-3.5" />
        </a>
      </div>

      {failed && <p className="px-6 py-8 text-center text-sm text-muted-foreground">Couldn&apos;t load holders right now.</p>}

      {!failed && holders === null && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse border-b border-white/[0.06] bg-white/[0.02] last:border-0 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {holders?.length === 0 && (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">No one minted this badge.</p>
      )}

      {holders && holders.length > 0 && (
        <>
          <div className="hidden grid-cols-[48px_minmax(0,1fr)_90px_130px_40px] border-b border-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:grid">
            <span>#</span>
            <span>Holder</span>
            <span className="text-right">Token</span>
            <span className="text-right">Minted</span>
            <span />
          </div>
          <ol>
            {holders.map((holder, i) => (
              <li
                key={holder.txHash}
                className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-white/[0.06] px-4 py-3 last:border-0 sm:grid-cols-[48px_minmax(0,1fr)_90px_130px_40px] sm:gap-x-0 sm:px-6"
              >
                <span className="text-sm tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <Link href={`/profile/${holder.address}`} className="flex min-w-0 items-center gap-3 hover:underline">
                  <Identicon address={holder.address} size={32} tone="dark" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {holder.displayName ?? shortenAddress(holder.address)}
                    </span>
                    {holder.displayName && (
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{shortenAddress(holder.address)}</span>
                    )}
                    <span className="block text-[11px] text-muted-foreground sm:hidden">
                      #{holder.tokenId} · {formatDate(holder.mintedAt)}
                    </span>
                  </span>
                </Link>
                <span className="hidden text-right font-mono text-sm tabular-nums text-muted-foreground sm:block">#{holder.tokenId}</span>
                <span className="hidden text-right text-sm text-muted-foreground sm:block">{formatDate(holder.mintedAt)}</span>
                <a
                  href={txExplorerUrl(holder.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View mint transaction on Snowtrace"
                  className="flex justify-end text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
