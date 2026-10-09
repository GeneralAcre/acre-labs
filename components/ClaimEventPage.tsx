"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Product, PublicEventWithSupply } from "@/lib/types";
import { claimNftOnChain, Web3ClaimError } from "@/lib/web3/claimNft";
import { addressExplorerUrl, txExplorerUrl } from "@/lib/web3/chains";
import { EventBadge } from "@/components/EventBadge";
import { PassportCard } from "@/components/PassportCard";
import { HoldersTable } from "@/components/HoldersTable";
import { useWallet } from "@/components/WalletProvider";

type Stage =
  | "loading"
  | "not_found"
  | "code_entry"
  | "expired"
  | "sold_out"
  | "claiming"
  | "success";

const COPY: Record<
  Product,
  {
    codeInstructions: string;
    successHeading: string;
    passLabel: string;
  }
> = {
  badge: {
    codeInstructions: "Enter the 6-digit code shown at the venue to claim your NFT",
    successHeading: "NFT Claimed!",
    passLabel: "Proof of Attendance",
  },
  content: {
    codeInstructions: "Enter the 6-digit code from the organizer to mint your passport",
    successHeading: "Your Pass Is Minted!",
    passLabel: "Hackathon Pass",
  },
};

function isSoldOut(record: PublicEventWithSupply): boolean {
  return typeof record.maxSupply === "number" && record.claimedCount >= record.maxSupply;
}

export function ClaimEventPage({
  product,
  params,
}: {
  product: Product;
  params: Promise<{ eventId: string }>;
}) {
  const copy = COPY[product];
  // The route param is the event's public slug, not its internal uuid —
  // once the event record loads, event.id (the real uuid) is what's used
  // everywhere else (contract calls, /api/claim, /api/claims).
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

      // The mint never went through (rejected, insufficient funds, RPC
      // error) — free the reservation now instead of leaving it pending for
      // the full TTL so the wallet can retry right away.
      fetch("/api/claim", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, walletAddress: address }),
      }).catch(() => {});
    }
  }

  const claimPercent =
    event && typeof event.maxSupply === "number" && event.maxSupply > 0
      ? Math.min(100, Math.round((event.claimedCount / event.maxSupply) * 100))
      : null;

  // Claiming is over: show the badge's details, mint stats and holders
  // instead of a bare "closed" notice.
  if ((stage === "expired" || stage === "sold_out") && event) {
    return <ClosedBadge event={event} soldOut={stage === "sold_out"} />;
  }

  if (stage === "success" && txHash && event && address) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-16 sm:px-6">
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-2">
            <span className="brand-kicker text-muted-foreground">Success</span>
            <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
              {copy.successHeading}
            </h1>
          </div>

          <PassportCard
            title={event.title}
            imageUrl={event.imageUrl}
            location={event.location}
            eventEndTime={event.eventEndTime}
            holderAddress={address}
            verifyPath={`/collection/${txHash}`}
            tokenId={tokenId}
            passLabel={copy.passLabel}
          />

          <p className="max-w-md text-xs text-muted-foreground">
            It should already appear in your wallet{tokenId ? ` — Token #${tokenId}` : ""}. If
            not, look for a &quot;refresh NFTs&quot; option in Core or MetaMask.
          </p>

          <div className="h-px w-full max-w-md bg-border" />

          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <a
              href={txExplorerUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-outline-light h-11 flex-1 px-5 text-sm font-semibold"
            >
              View on SnowTrace
            </a>
            <Link href="/profile" className="pill-light h-11 flex-1 px-5 text-sm">
              View My Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex flex-1 items-center justify-center bg-background px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(60,131,246,0.14),transparent_60%)]" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl shadow-black/50 sm:p-8">
        <div className="flex flex-col items-center gap-6">
          {stage === "loading" && (
            <p className="py-8 text-sm text-muted-foreground">Loading event…</p>
          )}

          {stage === "not_found" && (
            <>
              <StateGlyph>?</StateGlyph>
              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-muted-foreground">Attendee Access</span>
                <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
                  Event Not Found
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
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
                <span className="brand-kicker text-muted-foreground">Claim Window</span>
                <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
                  Claim Window Closed
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
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
                <span className="brand-kicker text-muted-foreground">Claim Window</span>
                <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
                  Sold Out
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {event?.title ? `"${event.title}" ` : "This drop "}
                has reached its {event?.maxSupply} badge cap. Contact the organizer if you
                believe this is a mistake.
              </p>
            </>
          )}

          {(stage === "code_entry" || stage === "claiming") && event && (
            <>
              <div className="rounded-full shadow-[0_0_60px_-10px_rgba(60,131,246,0.55)]">
                <EventBadge title={event.title} imageUrl={event.imageUrl} size={140} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="brand-kicker text-muted-foreground">Attendee Access</span>
                <h1 className="font-heading font-bold text-2xl tracking-tight text-foreground">
                  {event.title}
                </h1>
              </div>

              {event.description && (
                <p className="max-w-sm text-sm text-muted-foreground">{event.description}</p>
              )}

              {claimPercent !== null && (
                <div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      Claimed
                    </span>
                    <span className="font-heading font-bold text-sm text-foreground">
                      {event.claimedCount} / {event.maxSupply}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-brand-blue transition-[width] duration-500"
                      style={{ width: `${claimPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="h-px w-full bg-border" />

              {!address ? (
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to claim this NFT
                </p>
              ) : (
                <div className="flex w-full flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">{copy.codeInstructions}</p>
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
                      className="h-14 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-center font-mono text-2xl uppercase tracking-[0.4em] text-foreground placeholder:text-muted-foreground/50 focus:border-white/40 focus:outline-none"
                    />
                    {errorMessage && (
                      <p className="w-full rounded-lg border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-foreground">
                        {errorMessage}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={stage === "claiming" || code.length !== 6}
                      className="pill-light h-11 w-full text-sm disabled:pointer-events-none disabled:opacity-50"
                    >
                      {stage === "claiming" ? "Claiming…" : "Claim NFT"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function ClosedBadge({ event, soldOut }: { event: PublicEventWithSupply; soldOut: boolean }) {
  const supply = typeof event.maxSupply === "number" ? event.maxSupply : null;
  const percent = supply ? Math.min(100, Math.round((event.claimedCount / supply) * 100)) : null;
  const details: { label: string; value: React.ReactNode }[] = [
    ...(event.location ? [{ label: "Location", value: event.location }] : []),
    { label: "Event date", value: formatDate(event.eventEndTime) },
    { label: soldOut ? "Sold out" : "Claim closed", value: soldOut ? "All badges claimed" : formatDate(event.expiresAt) },
    {
      label: "Contract",
      value: (
        <a
          href={addressExplorerUrl(event.contractAddress)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-foreground hover:underline"
        >
          {event.contractAddress.slice(0, 6)}…{event.contractAddress.slice(-4)} ↗
        </a>
      ),
    },
  ];

  return (
    <main className="relative isolate flex-1 bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(60,131,246,0.14),transparent_65%)]" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Link href="/badge" className="pill-outline-light inline-flex h-10 w-fit items-center px-4 text-sm font-medium">All badges</Link>

        <section className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#1f1f1f,#0a0a0a_75%)] p-8">
            <div className="rounded-full shadow-[0_0_60px_-12px_rgba(60,131,246,0.45)]">
              <EventBadge title={event.title} imageUrl={event.imageUrl} size={200} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5 p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center rounded-md bg-brand-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {soldOut ? "Sold out" : "Claim closed"}
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{event.title}</h1>
              {event.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-4">
              {details.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{item.label}</dt>
                  <dd className="mt-1 truncate text-sm text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-border bg-secondary px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Minted</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {event.claimedCount}
                  {supply ? ` / ${supply}` : ""}
                  {percent !== null && <span className="ml-2 font-normal text-muted-foreground">{percent}%</span>}
                </span>
              </div>
              {percent !== null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-accent">
                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${percent}%` }} />
                </div>
              )}
            </div>
          </div>
        </section>

        <HoldersTable eventId={event.id} contractAddress={event.contractAddress} />
      </div>
    </main>
  );
}

function StateGlyph({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary font-heading font-bold text-muted-foreground">
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
