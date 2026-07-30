"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PublicEventWithSupply } from "@/lib/types";
import { claimNftOnChain, Web3ClaimError } from "@/lib/web3/claimNft";
import { txExplorerUrl } from "@/lib/web3/chains";
import { EventBadge } from "@/components/EventBadge";
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

  const claimPercent =
    event && typeof event.maxSupply === "number" && event.maxSupply > 0
      ? Math.min(100, Math.round((event.claimedCount / event.maxSupply) * 100))
      : null;

  return (
    <div className="brand-gradient flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-md rounded-3xl border border-brand-mist/10 bg-black/30 p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10">
        <div className="flex flex-col items-center gap-6">
          {stage === "loading" && (
            <p className="py-8 text-sm text-brand-mist/80">Loading event…</p>
          )}

          {stage === "not_found" && (
            <>
              <StateGlyph>?</StateGlyph>
              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-brand-mist/60">Attendee Access</span>
                <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                  Event Not Found
                </h1>
              </div>
              <p className="text-sm text-brand-mist/70">
                Double-check the claim link and try again.
              </p>
            </>
          )}

          {stage === "expired" && (
            <>
              <StateGlyph>
                <ClockIcon />
              </StateGlyph>
              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-brand-mist/60">Claim Window</span>
                <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                  Claim Window Closed
                </h1>
              </div>
              <p className="text-sm text-brand-mist/70">
                {event?.title ? `The claim window for "${event.title}" ` : "The claim window "}
                closed at the end of the day after the event finished. Contact the organizer
                if you believe this is a mistake.
              </p>
            </>
          )}

          {stage === "sold_out" && (
            <>
              <StateGlyph>
                <XIcon />
              </StateGlyph>
              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-brand-mist/60">Claim Window</span>
                <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                  Sold Out
                </h1>
              </div>
              <p className="text-sm text-brand-mist/70">
                {event?.title ? `"${event.title}" ` : "This drop "}
                has reached its {event?.maxSupply} badge cap. Contact the organizer if you
                believe this is a mistake.
              </p>
            </>
          )}

          {(stage === "code_entry" || stage === "claiming") && event && (
            <>
              <div className="rounded-full shadow-[0_0_50px_-8px_rgba(255,255,255,0.25)]">
                <EventBadge title={event.title} imageUrl={event.imageUrl} size={88} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-brand-mist/60">Attendee Access</span>
                <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                  {event.title}
                </h1>
              </div>

              {event.description && (
                <p className="max-w-sm text-sm text-brand-mist/70">{event.description}</p>
              )}

              {claimPercent !== null && (
                <div className="flex w-full flex-col gap-2 rounded-xl border border-brand-mist/15 bg-brand-mist/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50">
                      Claimed
                    </span>
                    <span className="font-heading text-sm text-brand-mist">
                      {event.claimedCount} / {event.maxSupply}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-mist/10">
                    <div
                      className="h-full rounded-full bg-brand-mist transition-[width] duration-500"
                      style={{ width: `${claimPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="h-px w-full bg-brand-mist/10" />

              {!address ? (
                <p className="text-sm text-brand-mist/80">
                  Connect your wallet to claim this NFT
                </p>
              ) : (
                <div className="flex w-full flex-col items-center gap-4">
                  <p className="text-sm text-brand-mist/80">
                    Enter the 6-digit code shown at the venue to claim your NFT
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
                      className="w-full rounded-xl border border-brand-mist/20 bg-brand-mist/5 px-4 py-4 text-center font-mono text-2xl uppercase tracking-[0.4em] text-brand-mist placeholder:text-brand-mist/30 focus:border-brand-mist/50 focus:outline-none focus:ring-2 focus:ring-brand-mist/20"
                    />
                    {errorMessage && (
                      <p className="w-full rounded-lg border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-mist">
                        {errorMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={stage === "claiming" || code.length !== 6}
                      className="pill-dark h-12 w-full text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {stage === "claiming" ? "Claiming…" : "Claim NFT"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {stage === "success" && txHash && event && (
            <>
              <div className="rounded-full shadow-[0_0_60px_-6px_rgba(255,255,255,0.35)]">
                <EventBadge title={event.title} imageUrl={event.imageUrl} size={96} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-brand-mist/60">Success</span>
                <h1 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                  NFT Claimed!
                </h1>
              </div>

              <p className="text-sm text-brand-mist/80">
                Your claim transaction was submitted on Avalanche
                {tokenId ? ` — Token #${tokenId}` : ""}.
              </p>
              <p className="text-xs text-brand-mist/50">
                It should already appear in your wallet. If not, look for a &quot;refresh
                NFTs&quot; option in Core or MetaMask.
              </p>

              <div className="h-px w-full bg-brand-mist/10" />

              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <a
                  href={txExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill-outline-light h-11 flex-1 px-6 text-sm font-medium"
                >
                  View on SnowTrace
                </a>
                <Link
                  href="/profile"
                  className="pill-dark h-11 flex-1 px-6 text-sm font-medium"
                >
                  View My Collection
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StateGlyph({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-mist/15 bg-brand-mist/5 font-heading text-brand-mist/70">
      {children}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="15.5" y2="14" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-7 w-7">
      <circle cx="12" cy="12" r="9" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}
