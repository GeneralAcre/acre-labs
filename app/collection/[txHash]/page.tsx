"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { CollectedClaim } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";
import { ACTIVE_CHAIN, txExplorerUrl } from "@/lib/web3/chains";
import { useNow } from "@/lib/useNow";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function shortDropId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Stage = "loading" | "not_found" | "ready";

export default function ClaimDetailPage({
  params,
}: {
  params: Promise<{ txHash: string }>;
}) {
  const { txHash } = use(params);
  const { address: myAddress } = useWallet();
  const [claim, setClaim] = useState<CollectedClaim | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const now = useNow();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/claims/${txHash}`);
      if (cancelled) return;

      if (!res.ok) {
        setStage("not_found");
        return;
      }

      const data = await res.json();
      setClaim(data.claim);
      setStage("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [txHash]);

  if (stage === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-brand-mist/60">Loading…</p>
      </div>
    );
  }

  if (stage === "not_found" || !claim) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">My Collection</span>
        <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
          Claim Not Found
        </h1>
        <p className="text-sm text-brand-mist/60">
          This claim doesn&apos;t exist or the link is incorrect.
        </p>
        <Link href="/collection" className="pill-dark h-11 px-6 text-sm font-medium">
          Back to Collection
        </Link>
      </div>
    );
  }

  const closed = now !== null && now > claim.event.expiresAt;
  const isMine = !!myAddress && myAddress.toLowerCase() === claim.walletAddress;
  const backHref = isMine ? "/profile" : `/profile/${claim.walletAddress}`;
  const backLabel = isMine ? "Back to My Profile" : "Back to Profile";

  return (
    <div className="flex flex-1 flex-col">
      {/* Short decorative banner — the badge card and content below float over
          it via negative margin, so it never has to carry readable text. */}
      <div className="brand-gradient h-40 sm:h-48" />

      <div className="mx-auto -mt-28 w-full max-w-5xl flex-1 px-4 pb-16 sm:-mt-32">
        <Link
          href={backHref}
          className="pill-light mb-6 inline-flex h-9 items-center gap-1.5 px-4 text-xs font-medium"
        >
          {backLabel}
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-mist/10 bg-brand-surface p-8 text-center shadow-sm">
            <EventBadge title={claim.event.title} imageUrl={claim.event.imageUrl} size={220} />
            <span className="pill-outline-light inline-flex h-9 items-center px-4 text-xs font-medium text-brand-mist/70">
              {isMine ? "Claimed by you" : `Claimed by ${shortenAddress(claim.walletAddress)}`}
            </span>
          </div>

          <div className="flex flex-col gap-5 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-brand-mist/40">
              <span>
                Drop <span className="text-brand-mist">#{shortDropId(claim.event.id)}</span>
              </span>
              <span>/</span>
              <a
                href={txExplorerUrl(claim.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="normal-case tracking-normal text-brand-red hover:underline"
              >
                View on SnowTrace
              </a>
            </div>

            <h1 className="font-heading text-3xl uppercase leading-tight tracking-tight text-brand-mist sm:text-4xl">
              {claim.event.title}
            </h1>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  closed ? "bg-brand-red/10 text-brand-red" : "bg-brand-mist/10 text-brand-mist"
                }`}
              >
                {closed ? "Claim window closed" : "Claim open"}
              </span>
              <span className="rounded-full bg-brand-mist/10 px-3 py-1 text-xs font-medium text-brand-mist">
                {ACTIVE_CHAIN.name}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Claimed</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">
                  {formatDate(claim.claimedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Event Ended</span>
                <p className="mt-1 text-sm font-medium text-brand-mist">
                  {formatDate(claim.event.eventEndTime)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Wallet</span>
                <p className="mt-1 font-mono text-sm font-medium text-brand-mist">
                  {shortenAddress(claim.walletAddress)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm">
                <span className="text-xs text-brand-mist/50">Contract</span>
                <p className="mt-1 font-mono text-sm font-medium text-brand-mist">
                  {shortenAddress(claim.event.contractAddress)}
                </p>
              </div>
              <div className="rounded-xl border border-brand-mist/10 bg-brand-surface p-4 shadow-sm sm:col-span-2">
                <span className="text-xs text-brand-mist/50">Transaction</span>
                <p className="mt-1 break-all font-mono text-sm font-medium text-brand-mist">
                  {claim.txHash}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
