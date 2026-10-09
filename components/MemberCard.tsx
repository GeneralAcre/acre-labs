"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toPng } from "html-to-image";
import { Download, ExternalLink, X } from "lucide-react";
import { Identicon } from "./Identicon";
import { DEFAULT_ACCENT_COLOR, DEFAULT_CARD_COLOR, readableTextOn } from "@/lib/color";
import { memberIdLabel } from "@/lib/memberId";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Deterministic 32-bit hash so a card's barcode never changes between
// renders or devices.
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


// Decorative barcode: bar widths derived from the card's seed.
function Barcode({ seed }: { seed: string }) {
  const bars: { x: number; w: number }[] = [];
  let h = hash(seed);
  let x = 0;
  while (x < 96) {
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    const w = 1 + (h % 3);
    const gap = 1 + ((h >>> 3) % 2);
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={20} fill="currentColor" />
      ))}
    </svg>
  );
}

// Shrinks text (in cqw, so it scales with the card) until it fits its box
// on one line, measuring the real rendered width rather than guessing from
// character count. Only if it still overflows at minSize does it wrap — text
// is never cut off with an ellipsis. Re-fits whenever the card resizes.
function FitText({
  text,
  maxSize,
  minSize,
  className = "",
  style,
}: {
  text: string;
  maxSize: number;
  minSize: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    function fit() {
      if (!el) return;
      let size = maxSize;
      el.style.whiteSpace = "nowrap";
      el.style.fontSize = `${size}cqw`;
      while (el.scrollWidth > el.clientWidth + 1 && size > minSize) {
        size = Math.max(minSize, size - 0.2);
        el.style.fontSize = `${size}cqw`;
      }
      if (el.scrollWidth > el.clientWidth + 1) el.style.whiteSpace = "normal";
    }
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, maxSize, minSize]);

  return (
    <p ref={ref} className={`min-w-0 break-words ${className}`} style={{ ...style, fontSize: `${maxSize}cqw` }}>
      {text}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[2.1cqw] font-semibold uppercase leading-none tracking-wide">{label}:</p>
      <FitText
        text={value}
        maxSize={4.2}
        minSize={1.8}
        className="mt-[0.6cqw] font-serif uppercase leading-[1.05] tracking-tight"
      />
    </div>
  );
}

// A community member card styled as a landscape ID card: photo + barcode on
// the left, the community as the headline, ID-style fields, and a colored
// strip along the bottom. The layout is fixed; each community's template only
// sets cardColor (background) and accentColor (headline + bottom strip), with
// text color picked automatically for contrast. Every size is in container-query units (cqw) so the card
// scales as one piece from the wall's small tiles to the large preview.
export function MemberCard({
  id,
  memberNo,
  communityName,
  communityLogo = null,
  name,
  xHandle,
  avatarUrl,
  role = null,
  cardColor = DEFAULT_CARD_COLOR,
  accentColor = DEFAULT_ACCENT_COLOR,
  issuedAt = null,
  joinedAt,
  preview = false,
  className = "",
}: {
  id: string;
  // Join position in the community; rendered as e.g. "TE-0001".
  memberNo: number;
  communityName: string;
  // Optional logo shown bare (no frame) beside the headline.
  communityLogo?: string | null;
  name: string;
  xHandle: string;
  avatarUrl: string | null;
  role?: string | null;
  cardColor?: string;
  accentColor?: string;
  // The event's chosen date of issue; falls back to when the member joined.
  issuedAt?: number | null;
  joinedAt: number;
  preview?: boolean;
  className?: string;
}) {
  const number = memberIdLabel(communityName, memberNo);
  const ink = readableTextOn(cardColor);
  const stripInk = readableTextOn(accentColor);

  const body = (
    <div
      className="relative flex aspect-[1.55/1] w-full flex-col overflow-hidden rounded-[3.5cqw]"
      style={{ backgroundColor: cardColor, color: ink }}
    >
      <div className="flex flex-1 gap-[4cqw] px-[4.5cqw] pt-[4cqw]">
        {/* Photo + barcode */}
        <div className="flex w-[31%] shrink-0 flex-col">
          <p className="text-[1.6cqw] font-semibold uppercase leading-tight">
            Identification card
            <br />
            No: {number}
          </p>
          <div className="mt-[1cqw] aspect-[3/4] w-full overflow-hidden bg-neutral-900">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- member-uploaded data: URI
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                <Identicon address={xHandle} size={56} tone="dark" className="border-0 bg-transparent" />
              </div>
            )}
          </div>
          <div className="mt-[1.5cqw] h-[6cqw] w-full">
            <Barcode seed={id} />
          </div>
        </div>

        {/* Headline + fields */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-right font-serif text-[2.6cqw] lowercase italic leading-none opacity-70">
            member id card
          </p>
          <div className="mt-[1cqw] flex min-w-0 items-center gap-[1.8cqw]">
            {communityLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- creator-uploaded data: URI
              <img src={communityLogo} alt="" className="h-[9cqw] w-auto max-w-[14cqw] shrink-0 object-contain" />
            ) : null}
            {/* Right/bottom padding leaves room for the italic slant and drop
                shadow, which the width measurement doesn't include. */}
            <FitText
              text={communityName}
              maxSize={6.4}
              minSize={3}
              className="flex-1 pb-[0.4cqw] pr-[1.4cqw] font-black uppercase italic leading-[0.95] tracking-tight"
              style={{ color: accentColor, textShadow: `0.25cqw 0.25cqw 0 ${ink}` }}
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-x-[3cqw] gap-y-[2.6cqw] pb-[1.5cqw]">
            <Field label="Name" value={name} />
            <Field label="X handle" value={`@${xHandle}`} />
            <Field label="Community" value={communityName} />
            <Field label="Role" value={role || "Member"} />
          </div>

          <div className="flex items-end justify-between gap-[2cqw] border-t border-current/25 pb-[2.4cqw] pt-[1.2cqw] text-[1.5cqw] font-semibold uppercase leading-tight">
            <span>Date of issue {formatDate(issuedAt ?? joinedAt)}</span>
            <span className="text-right">
              Issued on AcreLabs
              <br />
              <span className="font-normal normal-case">the holder of this card is a community member</span>
            </span>
          </div>
        </div>
      </div>

      {/* Accent strip */}
      <div
        className="flex items-center justify-between gap-[2cqw] border-t-[0.4cqw] px-[4.5cqw] py-[1.4cqw] font-serif text-[2.4cqw] leading-none"
        style={{ backgroundColor: accentColor, color: stripInk, borderColor: ink }}
      >
        <FitText text={communityName} maxSize={2.4} minSize={1.4} className="flex-1 uppercase leading-none" />
        <span className="shrink-0">Verified member · AcreLabs</span>
      </div>
    </div>
  );

  // The outer element is the size container the cqw units resolve against.
  const frame = `block w-full [container-type:inline-size] ${className}`;

  if (preview) {
    return <div className={frame}>{body}</div>;
  }
  return (
    <CardViewer body={body} fileName={`${number}-${xHandle}`} xHandle={xHandle} frameClassName={frame} />
  );
}

// A real (non-preview) card is clickable: it opens large in a dialog where it
// can be downloaded as a PNG or followed through to the member's X profile.
function CardViewer({
  body,
  fileName,
  xHandle,
  frameClassName,
}: {
  body: ReactNode;
  fileName: string;
  xHandle: string;
  frameClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function download() {
    if (!captureRef.current) return;
    setError(null);
    setDownloading(true);
    try {
      // 3x pixel ratio for a crisp, print-friendly image.
      const dataUrl = await toPng(captureRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fileName}.png`;
      link.click();
    } catch {
      setError("Couldn't create the image. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {/* A div with button semantics: the card contains block elements,
          which aren't valid inside a real <button>. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="Open member card"
        className={`${frameClassName} cursor-pointer rounded-xl transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
      >
        {body}
      </div>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Member card"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div className="flex w-full max-w-2xl flex-col gap-4" onClick={(event) => event.stopPropagation()}>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/80 transition-colors hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div ref={captureRef} className="w-full [container-type:inline-size]">
                {body}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={download} disabled={downloading} className="pill-light h-11 gap-2 px-5 text-sm disabled:opacity-50">
                  <Download className="size-4" />
                  {downloading ? "Preparing…" : "Download PNG"}
                </button>
                <a
                  href={`https://x.com/${xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pill-outline-light h-11 gap-2 bg-black/40 px-5 text-sm font-semibold"
                >
                  <ExternalLink className="size-4" />
                  View @{xHandle} on X
                </a>
              </div>
              {error && <p className="text-center text-sm text-brand-red">{error}</p>}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
