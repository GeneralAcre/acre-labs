"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/WalletProvider";
import { signMessage } from "@/lib/web3/wallet";
import { signInMessage } from "@/lib/authMessage";

// Organizer-only APIs (GET /api/events, which returns secret claim codes)
// require a signed session cookie proving wallet ownership. This checks for
// an existing session whenever the connected wallet changes — switching
// wallets re-gates behind a fresh signature for that address — and exposes a
// one-signature, no-gas signIn() to create one.
export function useOwnerSession() {
  const { address, provider } = useWallet();
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const res = await fetch("/api/auth/session");
      const data = await res.json().catch(() => ({ address: null }));
      if (!cancelled) {
        setSessionAddress(data.address ?? null);
        setSessionChecked(true);
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, [address]);

  async function signIn() {
    if (!address || !provider) return;
    setAuthError(null);
    setSigningIn(true);
    try {
      const issuedAt = new Date().toISOString();
      const message = signInMessage(address, issuedAt);
      const signature = await signMessage(provider, address, message);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, issuedAt, signature }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAuthError(data?.error ?? "Sign-in failed.");
        return;
      }
      setSessionAddress(data.address);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  }

  const isAuthenticated =
    !!address && !!sessionAddress && sessionAddress.toLowerCase() === address.toLowerCase();

  return { sessionChecked, isAuthenticated, signingIn, authError, signIn };
}
