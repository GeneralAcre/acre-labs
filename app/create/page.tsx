"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import type { EventRecord } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";
import { signMessage } from "@/lib/web3/wallet";
import { signInMessage } from "@/lib/authMessage";
import { useOrigin } from "@/lib/useOrigin";
import { useNow } from "@/lib/useNow";

// Claim count is derived server-side (from the claims store) and attached
// on top of the plain EventRecord shape returned by GET /api/events.
type OrganizerEvent = EventRecord & { claimedCount: number };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_SUPPLY_CAP = 200;

// Returns null for anything that isn't a real calendar date in YYYY-MM-DD —
// the native date input always hands back this format, but an empty value
// still needs to fail validation rather than parse as a valid timestamp.
function endOfDayTimestamp(dateString: string): number | null {
  if (!DATE_RE.test(dateString)) return null;
  const ms = new Date(`${dateString}T23:59:59.999`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const BADGE_MAX_DIMENSION = 512;
const BADGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024; // guards against hanging on a huge decode
const BADGE_ALPHA_THRESHOLD = 16; // ignore near-invisible anti-aliased edge pixels when finding art bounds

// Many badge/sticker exports (POAP-style PNGs) sit on a transparent canvas
// that's noticeably larger than the circular artwork itself. Scans the pixel
// alpha channel to find the bounding box of the actual (non-transparent)
// artwork, so we can crop to that instead of the full transparent canvas.
function findOpaqueBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { left: number; top: number; right: number; bottom: number } {
  const { data } = ctx.getImageData(0, 0, width, height);
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > BADGE_ALPHA_THRESHOLD) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  // Fully transparent image (nothing to trim) — fall back to the full canvas.
  if (right < left || bottom < top) {
    return { left: 0, top: 0, right: width - 1, bottom: height - 1 };
  }
  return { left, top, right, bottom };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Badge images are embedded directly in the on-chain metadata JSON that
// wallets fetch via tokenURI — an uncompressed phone photo (several MB) can
// be slow enough to fetch/render that some wallets time out and show the
// badge as blank. Resizing + re-encoding client-side keeps the payload small
// regardless of what the organizer uploads.
//
// The badge is always displayed in a circular 1:1 frame (see EventBadge), so
// this crops to a square around the actual artwork (trimming any transparent
// padding baked into the source file first — see findOpaqueBounds) and
// re-encodes as PNG. JPEG has no alpha channel, so any transparent pixels
// left in frame get flattened to opaque black on encode, which is what
// turned a slim transparent margin into a visible black ring inside the
// circular frame.
async function compressBadgeImage(file: File): Promise<string> {
  if (file.size > BADGE_SOURCE_MAX_BYTES) {
    throw new Error("Image is too large. Please choose a file under 20MB.");
  }

  const bitmap = await createImageBitmap(file);

  const probe = document.createElement("canvas");
  probe.width = bitmap.width;
  probe.height = bitmap.height;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });
  if (!probeCtx) throw new Error("Image compression isn't supported in this browser.");
  probeCtx.drawImage(bitmap, 0, 0);
  const bounds = findOpaqueBounds(probeCtx, bitmap.width, bitmap.height);

  const contentWidth = bounds.right - bounds.left + 1;
  const contentHeight = bounds.bottom - bounds.top + 1;
  const hasTransparentMargin =
    contentWidth < bitmap.width - 1 || contentHeight < bitmap.height - 1;

  let side: number;
  let sx: number;
  let sy: number;
  if (hasTransparentMargin) {
    side = Math.min(Math.max(contentWidth, contentHeight), bitmap.width, bitmap.height);
    const cx = bounds.left + contentWidth / 2;
    const cy = bounds.top + contentHeight / 2;
    sx = clamp(cx - side / 2, 0, bitmap.width - side);
    sy = clamp(cy - side / 2, 0, bitmap.height - side);
  } else {
    side = Math.min(bitmap.width, bitmap.height);
    sx = (bitmap.width - side) / 2;
    sy = (bitmap.height - side) / 2;
  }

  const size = Math.min(side, BADGE_MAX_DIMENSION);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression isn't supported in this browser.");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return canvas.toDataURL("image/png");
}

export default function CreateDropPage() {
  const { address, provider } = useWallet();

  // GET /api/events now requires proof of wallet ownership (it used to
  // return every organizer's secret claim codes to anyone who asked) — this
  // is a one-time signature per session, not a per-request cost.
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const origin = useOrigin();
  const now = useNow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAuthenticated =
    !!address && !!sessionAddress && sessionAddress.toLowerCase() === address.toLowerCase();

  async function loadEvents() {
    const res = await fetch("/api/events");
    if (!res.ok) {
      setEvents([]);
      return;
    }
    const data = await res.json();
    setEvents(data.events ?? []);
  }

  // Check for an existing session whenever the connected wallet changes —
  // switching wallets should re-gate behind a fresh signature for that address.
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

  useEffect(() => {
    // loadEvents is also called directly after creating a drop (see
    // handleSubmit) — this effect only covers the "load on
    // sign-in/wallet-switch" trigger, not a general subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuthenticated) loadEvents();
  }, [isAuthenticated]);

  async function handleSignIn() {
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

  async function handlePictureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const compressed = await compressBadgeImage(file);
      setImageDataUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!imageDataUrl) {
      setError("Badge picture is required.");
      return;
    }
    const eventEndTime = endOfDayTimestamp(eventEndDate);
    if (eventEndTime === null) {
      setError("Enter the event end date as YYYY-MM-DD.");
      return;
    }
    if (!maxSupply.trim()) {
      setError("Max supply is required.");
      return;
    }
    if (Number(maxSupply) > MAX_SUPPLY_CAP) {
      setError(`Max supply cannot exceed ${MAX_SUPPLY_CAP}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          eventEndTime,
          imageUrl: imageDataUrl,
          maxSupply: maxSupply.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create drop.");
        return;
      }

      setTitle("");
      setDescription("");
      setLocation("");
      setEventEndDate("");
      setImageDataUrl("");
      setMaxSupply("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadEvents();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  }

  async function copyLink(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId((current) => (current === id ? null : current)), 1500);
  }

  if (!address) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">[ New Drop ]</span>
        <h1 className="font-heading text-3xl uppercase tracking-tight text-brand-mist">
          Connect Your Wallet
        </h1>
        <p className="text-sm text-brand-mist/60">Manage the drops you create.</p>
        <p className="text-sm text-brand-mist/60">
          Connect your wallet using the button at the top of the page.
        </p>
      </div>
    );
  }

  if (!sessionChecked) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="brand-kicker text-brand-red">[ New Drop ]</span>
        <h1 className="font-heading text-3xl uppercase tracking-tight text-brand-mist">
          Sign In
        </h1>
        <p className="text-sm text-brand-mist/60">
          One signature, no gas, unlocks only the drops you made.
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="pill-dark mt-2 h-11 px-6 text-sm font-medium disabled:opacity-50"
        >
          {signingIn ? "Check your wallet…" : "Sign In"}
        </button>
        {authError && <p className="text-sm text-brand-red">{authError}</p>}
      </div>
    );
  }

  const activeEvents = events.filter((event) => !(now !== null && now > event.expiresAt));
  const historyEvents = events.filter((event) => now !== null && now > event.expiresAt);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="brand-kicker text-brand-red">[ 01 ] New Drop</span>
        <h1 className="font-heading text-4xl uppercase tracking-tight text-brand-mist sm:text-5xl">
          Create a Drop
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="title"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Event Title
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3 font-heading text-2xl uppercase tracking-tight text-brand-mist focus:border-brand-mist/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="location"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Location
            </label>
            <input
              id="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3 text-sm text-brand-mist focus:border-brand-mist/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Description
            </label>
            <textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3 text-sm text-brand-mist focus:border-brand-mist/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label
              htmlFor="picture"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Badge Picture
            </label>
            <div className="flex items-center gap-4 rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3">
              <EventBadge title={title || "?"} imageUrl={imageDataUrl || undefined} size={56} />
              <input
                ref={fileInputRef}
                id="picture"
                type="file"
                accept="image/*"
                required={!imageDataUrl}
                onChange={handlePictureChange}
                className="flex-1 text-xs text-brand-mist/70 file:mr-3 file:rounded-full file:border-0 file:bg-brand-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-mist"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="eventEndDate"
                className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
              >
                Event End Date
              </label>
              <input
                id="eventEndDate"
                type="date"
                required
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3 text-sm text-brand-mist focus:border-brand-mist/40 focus:outline-none"
              />
              <p className="text-xs text-brand-mist/40">
                Claim stays open through the next day.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="maxSupply"
                className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
              >
                Max Supply
              </label>
              <input
                id="maxSupply"
                type="number"
                min={1}
                max={MAX_SUPPLY_CAP}
                step={1}
                required
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                className="rounded-lg border border-brand-mist/15 bg-brand-surface px-4 py-3 text-sm text-brand-mist focus:border-brand-mist/40 focus:outline-none"
              />
              <p className="text-xs text-brand-mist/40">
                Capped at {MAX_SUPPLY_CAP} people. Drop closes early once reached.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="pill-dark h-12 self-start px-8 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create drop"}
          </button>
        </form>

        <aside className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/40">
              Preview
            </span>
            <EventBadge title={title || "Your Event"} imageUrl={imageDataUrl || undefined} size={160} />
          </div>

          <div className="flex flex-col gap-3">
            <span className="brand-kicker text-brand-red">[ 02 ] Your Drops</span>

            {activeEvents.length === 0 && (
              <p className="text-sm text-brand-mist/50">No active drops.</p>
            )}

            {activeEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-brand-mist/15 bg-brand-surface p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-heading text-sm uppercase tracking-wide text-brand-mist">
                    {event.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-full bg-brand-ink px-2 py-0.5 text-[10px] font-medium text-brand-mist">
                    Open
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-md bg-brand-mist px-3 py-1.5 text-center font-mono text-sm font-bold tracking-[0.25em] text-brand-ink">
                    {event.secretCode}
                  </span>
                  <button
                    onClick={() => copyCode(event.id, event.secretCode)}
                    className="whitespace-nowrap rounded-md border border-brand-mist/15 px-2 py-1.5 text-[11px] font-medium text-brand-mist hover:bg-brand-ink"
                  >
                    {copiedId === event.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                <button
                  onClick={() => copyLink(event.id, `${origin}/claim/${event.slug}`)}
                  className="rounded-md border border-brand-mist/15 px-2 py-1.5 text-[11px] font-medium text-brand-mist hover:bg-brand-ink"
                >
                  {copiedLinkId === event.id ? "Link copied!" : "Copy claim link"}
                </button>

                <p className="text-[11px] text-brand-mist/40">
                  Claimed {event.claimedCount}
                  {typeof event.maxSupply === "number" ? ` / ${event.maxSupply}` : " · unlimited"}
                </p>
              </div>
            ))}
          </div>

          {historyEvents.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-brand-mist/10 pt-6">
              <span className="brand-kicker mb-2 text-brand-mist/40">History</span>
              {historyEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/drop/${event.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs text-brand-mist/50 hover:bg-brand-ink hover:text-brand-mist"
                >
                  <span className="truncate">{event.title}</span>
                  <span className="whitespace-nowrap text-brand-mist/30">
                    Closed {formatDate(event.expiresAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
