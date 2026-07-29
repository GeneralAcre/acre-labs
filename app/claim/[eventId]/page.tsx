"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PublicEventWithSupply } from "@/lib/types";
import { claimNftOnChain, Web3ClaimError } from "@/lib/web3/claimNft";
import { txExplorerUrl } from "@/lib/web3/chains";
import { EventBadge } from "@/components/EventBadge";
import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@/components/WalletProvider";

type Stage =
  | "loading"
  | "not_found"
  | "code_entry"
  | "expired"
  | "sold_out"
  | "claiming"
  | "success";

function isSoldOut(record: PublicEventWithSupply): boolean {
  return typeof record.maxSupply === "number" && record.claimedCount >= record.maxSupply;
}

export default function ClaimEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  // The route param is the event's public slug, not its internal uuid — the
  // folder's still named [eventId] to avoid an unrelated file-move. Once the
  // event record loads, event.id (the real uuid) is what's used everywhere
  // else (contract calls, /api/claim, /api/claims).
  const { eventId: slug } = use(params);
  const { address, provider } = useWallet();
  const [event, setEvent] = useState<PublicEventWithSupply | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/events/${slug}`);
      if (cancelled) return;

      if (!res.ok) {
        setStage("not_found");
        return;
      }

      const data = await res.json();
      const record: PublicEventWithSupply = data.event;
      setEvent(record);
      if (Date.now() > record.expiresAt) {
        setStage("expired");
      } else if (isSoldOut(record)) {
        setStage("sold_out");
      } else {
        setStage("code_entry");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!event) return;

    setErrorMessage(null);

    if (!provider || !address) {
      setErrorMessage("Connect your wallet first.");
      return;
    }

    // Client-side check first so an obviously-expired claim never touches the wallet.
    if (Date.now() > event.expiresAt) {
      setStage("expired");
      return;
    }

    setStage("claiming");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, code, walletAddress: address }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.reason === "expired") {
          setStage("expired");
        } else if (data.reason === "sold_out") {
          setStage("sold_out");
        } else {
          setErrorMessage(
            data.reason === "invalid_code"
              ? "Incorrect code. Check the screen at the venue and try again."
              : data.reason === "already_claimed"
              ? "You've already claimed this drop with this wallet."
              : "Unable to validate this claim."
          );
          setStage("code_entry");
        }
        return;
      }

      const { txHash: hash, walletAddress, tokenId: mintedTokenId } = await claimNftOnChain(
        event.contractAddress,
        data.voucher,
        provider
      );
      setTxHash(hash);
      setTokenId(mintedTokenId);
      setStage("success");

      // Best-effort bookkeeping for the Collection page — the on-chain claim
      // already succeeded above, so a failure here shouldn't block success UI.
      fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, walletAddress, txHash: hash }),
      }).catch(() => {});
    } catch (err) {
      setErrorMessage(
        err instanceof Web3ClaimError
          ? err.message
          : "The claim transaction failed. Please try again."
      );
      setStage("code_entry");
    }
  }

  return (
    <div className="brand-gradient flex flex-1 flex-col items-center px-6 pt-24 pb-16 text-center">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        {stage === "loading" && (
          <p className="text-sm text-brand-mist/80">Loading event…</p>
        )}

        {stage === "not_found" && (
          <>
            <span className="brand-kicker text-brand-mist/80">Attendee Access</span>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
              Event Not Found
            </h1>
            <p className="text-sm text-brand-mist/90">
              Double-check the claim link and try again.
            </p>
          </>
        )}

        {stage === "expired" && (
          <>
            <span className="brand-kicker text-brand-mist/80">Claim Window</span>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
              Expired: Claim Window Closed
            </h1>
            <p className="text-sm text-brand-mist/90">
              {event?.title ? `The claim window for "${event.title}" ` : "The claim window "}
              ended 2 hours after the event finished. Contact the organizer if you believe
              this is a mistake.
            </p>
          </>
        )}

        {stage === "sold_out" && (
          <>
            <span className="brand-kicker text-brand-mist/80">Claim Window</span>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
              Sold Out
            </h1>
            <p className="text-sm text-brand-mist/90">
              {event?.title ? `"${event.title}" ` : "This drop "}
              has reached its {event?.maxSupply} badge cap. Contact the organizer if you
              believe this is a mistake.
            </p>
          </>
        )}

        {(stage === "code_entry" || stage === "claiming") && event && (
          <>
            <EventBadge title={event.title} imageUrl={event.imageUrl} size={80} />
            <span className="brand-kicker text-brand-mist/80">Attendee Access</span>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
              {event.title}
            </h1>
            {event.description && (
              <p className="max-w-sm text-sm text-brand-mist/80">{event.description}</p>
            )}
            {typeof event.maxSupply === "number" && (
              <p className="text-xs text-brand-mist/60">
                {event.claimedCount} / {event.maxSupply} claimed
              </p>
            )}

            {!address ? (
              <>
                <p className="text-sm text-brand-mist/90">
                  Connect your wallet to claim this NFT.
                </p>
                <WalletButton
                  size="lg"
                  tone="light"
                  connectLabel="Connect Wallet to Claim"
                  showSwitchLink
                />
              </>
            ) : (
              <>
                <p className="text-sm text-brand-mist/90">
                  Enter the 6-digit code shown at the venue to claim your NFT.
                </p>
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full flex-col items-center gap-4"
                >
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    autoFocus
                    placeholder="••••••"
                    disabled={stage === "claiming"}
                    className="w-48 rounded-lg border border-brand-mist/40 bg-brand-mist/10 px-4 py-3 text-center font-mono text-2xl uppercase tracking-[0.4em] text-brand-mist placeholder:text-brand-mist/40"
                  />
                  {errorMessage && (
                    <p className="text-sm text-brand-mist">{errorMessage}</p>
                  )}
                  <button
                    type="submit"
                    disabled={stage === "claiming" || code.length !== 6}
                    className="pill-dark h-12 w-full text-sm font-medium disabled:opacity-50"
                  >
                    {stage === "claiming" ? "Claiming…" : "Claim NFT"}
                  </button>
                </form>
              </>
            )}
          </>
        )}

        {stage === "success" && txHash && event && (
          <>
            <EventBadge title={event.title} imageUrl={event.imageUrl} size={88} />
            <span className="brand-kicker text-brand-mist/80">Success</span>
            <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
              NFT Claimed!
            </h1>
            <p className="text-sm text-brand-mist/90">
              Your claim transaction was submitted on Avalanche
              {tokenId ? ` — Token #${tokenId}` : ""}.
            </p>
            <p className="text-xs text-brand-mist/70">
              It should already appear in your wallet. If not, look for a &quot;refresh
              NFTs&quot; option in Core or MetaMask.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={txExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-outline-light h-11 px-6 text-sm font-medium"
              >
                View on SnowTrace
              </a>
              <Link href="/profile" className="pill-dark h-11 px-6 text-sm font-medium">
                View My Collection
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
