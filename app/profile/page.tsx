"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/components/WalletProvider";

// The connected wallet's own collection lives at /profile/[address] — the
// same route used to view anyone else's — so this index just resolves the
// address and hands off, rather than duplicating the claims-fetch/grid.
export default function MyProfilePage() {
  const { address } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (address) router.replace(`/profile/${address}`);
  }, [address, router]);

  if (address) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="brand-kicker text-brand-red">Your Wallet</span>
      <h1 className="font-heading text-3xl uppercase tracking-tight text-brand-mist">
        Connect Your Wallet
      </h1>
      <p className="text-sm text-brand-mist/60">
        Connect to see every event NFT you&apos;ve claimed on Avalanche.
      </p>
      <WalletButton tone="light" size="lg" className="mt-2" />
    </div>
  );
}
