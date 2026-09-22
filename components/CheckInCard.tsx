"use client";

import { Identicon } from "./Identicon";
import { PassportQr } from "./PassportQr";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// One tile in the check-in wall's set of passes — same card grammar as
// PassportCard (gradient header, light attendee section, QR) but keyed by
// name/X handle instead of a wallet, since Content no longer mints anything.
export function CheckInCard({
  name,
  xHandle,
  checkedInAt,
  className = "",
}: {
  name: string;
  xHandle: string;
  checkedInAt: number;
  className?: string;
}) {
  return (
    <a
      href={`https://x.com/${xHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col overflow-hidden rounded-2xl border border-brand-mist/10 bg-brand-ink shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <div className="badge-gradient dark-panel flex items-center justify-between px-4 py-3">
        <span className="brand-kicker text-brand-mist/80">Check-In Pass</span>
        <span className="text-[9px] font-medium uppercase tracking-widest text-brand-mist/70">
          AcreLabs
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center gap-3 bg-brand-mist px-5 py-6 text-center">
        <Identicon address={xHandle} size={56} />
        <div className="min-w-0">
          <p className="max-w-[10rem] truncate font-heading text-base uppercase tracking-tight text-brand-ink">
            {name}
          </p>
          <p className="mt-0.5 text-xs text-brand-ink/50">@{xHandle}</p>
        </div>

        <div className="mt-1 flex flex-col items-center gap-1">
          <PassportQr value={`https://x.com/${xHandle}`} size={48} className="rounded" />
          <span className="text-[8px] uppercase tracking-widest text-brand-ink/40">View on X</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-brand-mist/10 px-4 py-2">
        <span className="text-[9px] uppercase tracking-widest text-brand-mist/40">Content</span>
        <span className="text-[9px] text-brand-mist/40">{formatDate(checkedInAt)}</span>
      </div>
    </a>
  );
}
