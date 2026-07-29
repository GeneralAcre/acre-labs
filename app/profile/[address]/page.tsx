"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { CollectedClaim } from "@/lib/types";
import { ClaimGrid } from "@/components/ClaimGrid";
import { useWallet } from "@/components/WalletProvider";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

type Stage = "loading" | "ready";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: routeAddress } = use(params);
  const { address: myAddress } = useWallet();
  const [claims, setClaims] = useState<CollectedClaim[]>([]);
  const [stage, setStage] = useState<Stage>("loading");

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

  if (isInvalidAddress) {
    return (
      <div className="flex flex-1 flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">Explore</span>
        <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
          Invalid Wallet Address
        </h1>
        <p className="text-sm text-brand-mist/60">
          &quot;{routeAddress}&quot; doesn&apos;t look like a valid Avalanche address.
        </p>
        <Link href="/explore" className="pill-dark h-11 px-6 text-sm font-medium">
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="brand-gradient flex flex-col items-center px-6 pt-20 pb-14 text-center">
        <span className="brand-kicker text-brand-mist/80">
          {isMe ? "Your Wallet" : "Explore"}
        </span>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-tight text-brand-mist">
          {isMe ? "My Collection" : "Their Collection"}
        </h1>
        <p className="mt-3 font-mono text-xs text-brand-mist/70">
          {shortenAddress(routeAddress)}
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        {stage === "loading" && (
          <p className="text-sm text-brand-mist/60">Loading collection…</p>
        )}

        {stage === "ready" && claims.length === 0 && (
          <p className="text-center text-sm text-brand-mist/60">
            {isMe ? "You haven't" : "This wallet hasn't"} claimed any drops yet.
          </p>
        )}

        {claims.length > 0 && <ClaimGrid claims={claims} />}
      </div>
    </div>
  );
}
