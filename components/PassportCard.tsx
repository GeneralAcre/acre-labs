"use client";

import Image from "next/image";
import { Identicon } from "./Identicon";
import { PassportQr } from "./PassportQr";
import { useOrigin } from "@/lib/useOrigin";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// The claim/mint receipt, styled as a physical event pass rather than a bare
// "NFT claimed" confirmation — the QR encodes the same public claim-detail
// URL as the "View on SnowTrace" link elsewhere, so anyone scanning it lands
// on a page that independently verifies the claim (event, wallet, tx).
export function PassportCard({
  title,
  imageUrl,
  location,
  eventEndTime,
  holderAddress,
  verifyPath,
  tokenId,
  passLabel = "Hackathon Pass",
  className = "",
}: {
  title: string;
  imageUrl?: string;
  location?: string;
  eventEndTime: number;
  holderAddress: string;
  verifyPath: string;
  tokenId?: string | null;
  passLabel?: string;
  className?: string;
}) {
  const origin = useOrigin();
  const verifyUrl = origin ? `${origin}${verifyPath}` : verifyPath;

  return (
    <div
      className={`relative mx-auto grid w-full max-w-3xl overflow-hidden rounded-3xl border border-brand-mist/10 bg-brand-ink shadow-2xl shadow-black/40 sm:grid-cols-[1.3fr_1fr] ${className}`}
    >
      <div className="relative min-h-[200px] sm:min-h-[300px]">
        {imageUrl ? (
          <Image src={imageUrl} alt="" fill unoptimized className="object-cover" />
        ) : (
          <div className="badge-gradient absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 sm:p-7">
          <span className="brand-kicker text-brand-mist/70">{passLabel}</span>
          <h2 className="font-heading text-3xl uppercase leading-[0.9] tracking-tight text-brand-mist sm:text-4xl">
            {title}
          </h2>
          {location && <p className="text-xs text-brand-mist/60">{location}</p>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 bg-brand-mist px-6 py-7 text-center sm:px-7">
        <span className="brand-kicker text-brand-ink/50">Attendee</span>
        <Identicon address={holderAddress} size={72} />
        <div>
          <p className="font-mono text-sm font-medium text-brand-ink">
            {shortenAddress(holderAddress)}
          </p>
          <p className="mt-1 text-[11px] text-brand-ink/50">Ends {formatDate(eventEndTime)}</p>
        </div>

        <div className="mt-auto flex w-full items-end justify-between gap-3 pt-4">
          <div className="flex flex-col items-start gap-1.5">
            <PassportQr value={verifyUrl} size={64} className="rounded" />
            <span className="text-[9px] uppercase tracking-widest text-brand-ink/40">
              Scan to verify
            </span>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-ink/15 text-center text-[9px] font-medium uppercase leading-tight text-brand-ink/50">
            {tokenId ? `#${tokenId}` : "AVAX"}
          </div>
        </div>
      </div>
    </div>
  );
}
