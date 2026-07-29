"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CollectedClaim } from "@/lib/types";
import { ClaimGrid } from "@/components/ClaimGrid";
import { useWallet } from "@/components/WalletProvider";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CollectionPage() {
  const { address } = useWallet();
  const [claims, setClaims] = useState<CollectedClaim[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClaims = useCallback(async (walletAddress: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/claims?address=${walletAddress}`);
      const data = await res.json();
      setClaims(data.claims ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // loadClaims is also called directly from the "Refresh" button below —
    // this effect only covers the "load on wallet connect/switch" trigger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (address) loadClaims(address);
  }, [address, loadClaims]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="brand-gradient flex flex-col items-center px-6 pt-20 pb-14 text-center">
        <span className="brand-kicker text-brand-mist/80">Your Wallet</span>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-tight text-brand-mist">
          My Collection
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-mist/90">
          {address
            ? "Every event NFT you've claimed on Avalanche."
            : "Connect your wallet from the top-right to see every event NFT you've claimed on Avalanche."}
        </p>

        {address && (
          <div className="mt-8 flex items-center gap-3">
            <p className="font-mono text-xs text-brand-mist/70">
              {shortenAddress(address)}
            </p>
            <button
              onClick={() => loadClaims(address)}
              className="pill-outline-light h-12 px-5 text-xs font-medium"
            >
              Refresh
            </button>
          </div>
        )}
        <Link
          href="/explore"
          className="mt-4 text-xs text-brand-mist/70 underline-offset-2 hover:text-brand-mist hover:underline"
        >
          Explore other collections →
        </Link>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {address && loading && (
          <p className="text-sm text-brand-mist/60">Loading your collection…</p>
        )}

        {address && !loading && claims.length === 0 && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-brand-mist/60">
              No POAPs claimed yet with this wallet.
            </p>
            <Link href="/claim" className="pill-dark h-11 px-6 text-sm font-medium">
              Claim a Drop
            </Link>
          </div>
        )}

        {claims.length > 0 && <ClaimGrid claims={claims} />}
      </div>
    </div>
  );
}
