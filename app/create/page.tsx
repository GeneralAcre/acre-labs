"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { EventRecord } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { WalletButton } from "@/components/WalletButton";
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

// Returns null for anything that isn't a real calendar date in YYYY-MM-DD —
// the field is now free-typed text (no native date picker), so this is the
// only thing standing between a typo and an invalid timestamp being submitted.
function endOfDayTimestamp(dateString: string): number | null {
  if (!DATE_RE.test(dateString)) return null;
  const ms = new Date(`${dateString}T23:59:59.999`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const BADGE_MAX_DIMENSION = 512;
const BADGE_JPEG_QUALITY = 0.85;
const BADGE_SOURCE_MAX_BYTES = 20 * 1024 * 1024; // guards against hanging on a huge decode

// Badge images are embedded directly in the on-chain metadata JSON that
// wallets fetch via tokenURI — an uncompressed phone photo (several MB) can
// be slow enough to fetch/render that some wallets time out and show the
// badge as blank. Resizing + re-encoding client-side keeps the payload small
// regardless of what the organizer uploads.
async function compressBadgeImage(file: File): Promise<string> {
  if (file.size > BADGE_SOURCE_MAX_BYTES) {
    throw new Error("Image is too large. Please choose a file under 20MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, BADGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression isn't supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", BADGE_JPEG_QUALITY);
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
    const eventEndTime = endOfDayTimestamp(eventEndDate);
    if (eventEndTime === null) {
      setError("Enter the event end date as YYYY-MM-DD.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          eventEndTime,
          imageUrl: imageDataUrl || undefined,
          maxSupply: maxSupply.trim() || undefined,
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
        <WalletButton tone="light" size="lg" className="mt-2" />
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

  const previewEndTime = endOfDayTimestamp(eventEndDate);
  const previewClosed = now !== null && previewEndTime !== null && now > previewEndTime;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="brand-kicker text-brand-red">[ 01 ] New Drop</span>
        <h1 className="font-heading text-4xl uppercase tracking-tight text-brand-mist sm:text-5xl">
          Create a Drop
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[360px_1fr]">
        <div className="sticky top-24 self-start">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-brand-mist/15 bg-brand-surface p-8 text-center shadow-lg">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/40">
              Preview
            </span>
            <EventBadge title={title || "Your Event"} imageUrl={imageDataUrl || undefined} size={120} />
            <h3 className="font-heading text-xl uppercase tracking-tight text-brand-mist">
              {title || "Your Event"}
            </h3>
            <p className="text-xs text-brand-mist/60">{location || "Location · optional"}</p>
            {description && <p className="text-xs text-brand-mist/60">{description}</p>}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                previewClosed ? "bg-brand-red text-brand-mist" : "bg-brand-ink text-brand-mist"
              }`}
            >
              {previewClosed ? "Claim window closed" : "Claim open"}
            </span>
            <p className="text-xs text-brand-mist/40">Claim expires 2 hours after the event ends.</p>
            {maxSupply && (
              <p className="text-xs text-brand-mist/40">Capped at {maxSupply} badges</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2 border-b border-brand-mist/10 pb-6">
            <label
              htmlFor="title"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Event Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Avalanche Summit Afterparty"
              className="bg-transparent font-heading text-2xl uppercase tracking-tight text-brand-mist placeholder:text-brand-mist/25 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 border-b border-brand-mist/10 pb-6">
            <label
              htmlFor="location"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Location · optional
            </label>
            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Atlantic Terminal, 139 Flatbush Ave, BK, NY"
              className="bg-transparent text-sm text-brand-mist placeholder:text-brand-mist/30 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 border-b border-brand-mist/10 pb-6">
            <label
              htmlFor="description"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Description · optional
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the event was, who hosted it."
              rows={2}
              className="resize-none bg-transparent text-sm text-brand-mist placeholder:text-brand-mist/30 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 border-b border-brand-mist/10 pb-6">
            <label
              htmlFor="picture"
              className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
            >
              Badge Picture · optional
            </label>
            <div className="flex items-center gap-4">
              <EventBadge title={title || "?"} imageUrl={imageDataUrl || undefined} size={56} />
              <input
                ref={fileInputRef}
                id="picture"
                type="file"
                accept="image/*"
                onChange={handlePictureChange}
                className="flex-1 text-xs text-brand-mist/70 file:mr-3 file:rounded-full file:border-0 file:bg-brand-ink file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-mist"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-2 border-b border-brand-mist/10 pb-6">
              <label
                htmlFor="eventEndDate"
                className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
              >
                Event End Date · YYYY-MM-DD
              </label>
              <input
                id="eventEndDate"
                type="text"
                inputMode="numeric"
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="bg-transparent text-sm text-brand-mist focus:outline-none"
              />
              <p className="text-xs text-brand-mist/40">Claim expires 2 hours after this date.</p>
            </div>

            <div className="flex flex-col gap-2 border-b border-brand-mist/10 pb-6">
              <label
                htmlFor="maxSupply"
                className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/50"
              >
                Max Supply · optional
              </label>
              <input
                id="maxSupply"
                type="number"
                min={1}
                step={1}
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                placeholder="Unlimited"
                className="bg-transparent text-sm text-brand-mist placeholder:text-brand-mist/30 focus:outline-none"
              />
              <p className="text-xs text-brand-mist/40">Drop closes early once reached.</p>
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
      </div>

      <div className="flex flex-col gap-6 border-t border-brand-mist/10 pt-16">
        <span className="brand-kicker text-brand-red">[ 02 ] Your Drops</span>

        {events.length === 0 && <p className="text-sm text-brand-mist/50">No drops yet.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-4 rounded-2xl border-2 border-brand-mist/15 bg-brand-surface p-6 shadow-lg"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <EventBadge title={event.title} imageUrl={event.imageUrl} size={44} />
                  <div className="min-w-0">
                    <h3 className="font-heading tracking-wide text-brand-red">{event.title}</h3>
                    <p className="truncate text-xs text-brand-mist/50">
                      {event.location || "No location set"}
                    </p>
                  </div>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                    now !== null && now > event.expiresAt
                      ? "bg-brand-red text-brand-mist"
                      : "bg-brand-ink text-brand-mist"
                  }`}
                >
                  {now !== null && now > event.expiresAt ? "Closed" : "Open"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-brand-mist px-4 py-2 font-mono text-2xl font-bold tracking-[0.3em] text-brand-ink">
                  {event.secretCode}
                </span>
                <button
                  onClick={() => copyCode(event.id, event.secretCode)}
                  className="rounded-md border border-brand-mist/15 px-3 py-2 text-xs font-medium text-brand-mist hover:bg-brand-ink"
                >
                  {copiedId === event.id ? "Copied!" : "Copy code"}
                </button>
              </div>

              {event.description && (
                <p className="text-sm text-brand-mist/60">{event.description}</p>
              )}

              <div className="grid grid-cols-1 gap-1 text-xs text-brand-mist/40 sm:grid-cols-2">
                <span>Ends {formatDate(event.eventEndTime)}</span>
                <span>Closes {formatDate(event.expiresAt)}</span>
                <span>
                  Claimed {event.claimedCount}
                  {typeof event.maxSupply === "number" ? ` / ${event.maxSupply}` : " · unlimited"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-brand-mist/10 pt-3">
                <span className="break-all font-mono text-xs text-brand-mist/50">
                  {origin}/claim/{event.slug}
                </span>
                <button
                  onClick={() => copyLink(event.id, `${origin}/claim/${event.slug}`)}
                  className="rounded-md border border-brand-mist/15 px-2 py-1 text-[11px] font-medium text-brand-mist hover:bg-brand-ink"
                >
                  {copiedLinkId === event.id ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
