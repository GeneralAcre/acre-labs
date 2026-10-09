"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import type { EventRecord, Product } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";
import { Web3ClaimError } from "@/lib/web3/wallet";
import { useOrigin } from "@/lib/useOrigin";
import { useNow } from "@/lib/useNow";
import { useOwnerSession } from "@/lib/useOwnerSession";
import { compressSquareImage } from "@/lib/image";
import { deployDropContract } from "@/lib/web3/factory";
import { DROP_FACTORY_ADDRESS } from "@/lib/web3/chains";

// Claim count is derived server-side (from the claims store) and attached
// on top of the plain EventRecord shape returned by GET /api/events.
type OrganizerEvent = EventRecord & { claimedCount: number };

// Each product's claim gallery/detail pair lives under its own route prefix.
const CLAIM_BASE_PATH: Record<Product, string> = {
  badge: "/claim",
  content: "/content/claim",
};

const COPY: Record<
  Product,
  {
    newDropKicker: string;
    heading: string;
    pictureLabel: string;
    yourDropsKicker: string;
    noActiveDrops: string;
    connectSubtext: string;
    submitLabel: string;
  }
> = {
  badge: {
    newDropKicker: "New Badge",
    heading: "Create a Badge",
    pictureLabel: "Badge Picture",
    yourDropsKicker: "Your Badges",
    noActiveDrops: "No active badges.",
    connectSubtext: "Manage the badges you create.",
    submitLabel: "Create badge",
  },
  content: {
    newDropKicker: "New Pass",
    heading: "Host a Hackathon",
    pictureLabel: "Pass Artwork",
    yourDropsKicker: "Your Hackathons",
    noActiveDrops: "No active hackathons.",
    connectSubtext: "Manage the hackathons you host.",
    submitLabel: "Create pass",
  },
};

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

export function CreateDropPage({ product }: { product: Product }) {
  const copy = COPY[product];
  const claimBasePath = CLAIM_BASE_PATH[product];
  const { address, provider } = useWallet();

  // GET /api/events requires proof of wallet ownership (it used to return
  // every organizer's secret claim codes to anyone who asked) — a one-time
  // signature per session, not a per-request cost.
  const { sessionChecked, isAuthenticated, signingIn, authError, signIn: handleSignIn } = useOwnerSession();

  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deployStep, setDeployStep] = useState<"idle" | "deploying" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  // A drop already deployed on-chain but not yet persisted (e.g. the
  // follow-up POST /api/events failed) — retrying reuses this instead of
  // paying gas to deploy a second, orphaned clone for the same drop.
  const [pendingDeployment, setPendingDeployment] = useState<
    { id: string; contractAddress: string; txHash: string } | null
  >(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [extendDrafts, setExtendDrafts] = useState<Record<string, string>>({});
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [supplyDrafts, setSupplyDrafts] = useState<Record<string, string>>({});
  const [updatingSupplyId, setUpdatingSupplyId] = useState<string | null>(null);
  const [supplyError, setSupplyError] = useState<string | null>(null);
  const origin = useOrigin();
  const now = useNow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadEvents() {
    const res = await fetch("/api/events");
    if (!res.ok) {
      setEvents([]);
      return;
    }
    const data = await res.json();
    const allEvents: OrganizerEvent[] = data.events ?? [];
    setEvents(allEvents.filter((event) => event.product === product));
  }

  useEffect(() => {
    // loadEvents is also called directly after creating a drop (see
    // handleSubmit) — this effect only covers the "load on
    // sign-in/wallet-switch" trigger, not a general subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isAuthenticated) loadEvents();
  }, [isAuthenticated]);

  async function handlePictureChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const compressed = await compressSquareImage(file);
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

    if (!provider) {
      setError("Connect your wallet first.");
      return;
    }
    if (!DROP_FACTORY_ADDRESS) {
      setError("Drop factory isn't configured. Contact support.");
      return;
    }

    setSubmitting(true);
    try {
      // Reuse a deploy already in flight from a previous failed submit
      // instead of paying gas to deploy a second, orphaned clone.
      let deployment = pendingDeployment;
      if (!deployment) {
        setDeployStep("deploying");
        const configRes = await fetch("/api/events/deploy-config");
        const config = await configRes.json().catch(() => null);
        if (!configRes.ok || !config?.signerAddress) {
          setError(config?.error ?? "Failed to load deploy configuration.");
          return;
        }

        const id = crypto.randomUUID();
        const baseURI = `${origin}/api/metadata/${id}`;

        const { contractAddress, txHash } = await deployDropContract(
          DROP_FACTORY_ADDRESS,
          config.signerAddress,
          baseURI,
          provider
        );
        deployment = { id, contractAddress, txHash };
        setPendingDeployment(deployment);
      }

      setDeployStep("saving");
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deployment.id,
          contractAddress: deployment.contractAddress,
          deployTxHash: deployment.txHash,
          product,
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
        // Deployment already succeeded on-chain — keep it in pendingDeployment
        // so a retry reuses it instead of redeploying.
        setError(data.error ?? "Failed to create badge.");
        return;
      }

      setPendingDeployment(null);
      setTitle("");
      setDescription("");
      setLocation("");
      setEventEndDate("");
      setImageDataUrl("");
      setMaxSupply("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadEvents();
    } catch (err) {
      setError(err instanceof Web3ClaimError ? err.message : "Failed to create badge.");
    } finally {
      setSubmitting(false);
      setDeployStep("idle");
    }
  }

  async function handleExtend(eventId: string) {
    const draft = extendDrafts[eventId];
    const expiresAt = endOfDayTimestamp(draft ?? "");
    if (expiresAt === null) {
      setExtendError("Enter the new claim deadline as YYYY-MM-DD.");
      return;
    }

    setExtendError(null);
    setExtendingId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setExtendError(data?.error ?? "Failed to extend the deadline.");
        return;
      }
      setExtendDrafts((current) => {
        const next = { ...current };
        delete next[eventId];
        return next;
      });
      await loadEvents();
    } finally {
      setExtendingId(null);
    }
  }

  async function handleSupplyUpdate(event: OrganizerEvent) {
    const rawSupply = supplyDrafts[event.id] ?? String(event.maxSupply ?? "");
    const nextSupply = Number(rawSupply);
    if (!Number.isInteger(nextSupply) || nextSupply < 1 || nextSupply > MAX_SUPPLY_CAP) {
      setSupplyError(`Supply must be a whole number between 1 and ${MAX_SUPPLY_CAP}.`);
      return;
    }
    if (nextSupply < event.claimedCount) {
      setSupplyError(`Supply cannot be lower than the ${event.claimedCount} badge${event.claimedCount === 1 ? "" : "s"} already claimed.`);
      return;
    }

    setSupplyError(null);
    setUpdatingSupplyId(event.id);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSupply: nextSupply }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSupplyError(data?.error ?? "Failed to update supply.");
        return;
      }
      setSupplyDrafts((current) => {
        const next = { ...current };
        delete next[event.id];
        return next;
      });
      await loadEvents();
    } finally {
      setUpdatingSupplyId(null);
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
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="brand-kicker text-muted-foreground">{copy.newDropKicker}</span>
        <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">
          Connect Your Wallet
        </h1>
        <p className="text-sm text-muted-foreground">{copy.connectSubtext}</p>
        <p className="text-sm text-muted-foreground">
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
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <span className="brand-kicker text-muted-foreground">{copy.newDropKicker}</span>
        <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">
          Sign In
        </h1>
        <p className="text-sm text-muted-foreground">
          One signature, no gas, unlocks only the drops you made.
        </p>
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="pill-light mt-2 h-11 px-6 text-sm disabled:opacity-50"
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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <span className="brand-kicker text-muted-foreground">{copy.newDropKicker}</span>
        <h1 className="font-heading font-bold text-4xl tracking-tight text-foreground sm:text-5xl">
          {copy.heading}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="title"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Event Title
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 font-heading font-bold text-2xl tracking-tight text-foreground focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="location"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Location
            </label>
            <input
              id="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="description"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label
              htmlFor="picture"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              {copy.pictureLabel} <span className="text-brand-red">*</span>
            </label>
            <div
              className={`flex items-center gap-4 rounded-lg border bg-white/[0.04] px-4 py-3 ${
                imageDataUrl ? "border-white/[0.08]" : "border-dashed border-white/20"
              }`}
            >
              <EventBadge title={title || "?"} imageUrl={imageDataUrl || undefined} size={56} />
              <input
                ref={fileInputRef}
                id="picture"
                type="file"
                accept="image/*"
                required={!imageDataUrl}
                onChange={handlePictureChange}
                className="flex-1 text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="eventEndDate"
                className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
              >
                Event End Date
              </label>
              <input
                id="eventEndDate"
                type="date"
                required
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground focus:border-white/40 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground/70">
                Claim stays open through the next day.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="maxSupply"
                className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
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
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-foreground focus:border-white/40 focus:outline-none"
              />
              <p className="text-xs text-muted-foreground/70">
                Capped at {MAX_SUPPLY_CAP} people. Claiming closes early once reached.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <div className="flex flex-col items-start gap-2">
            {!imageDataUrl && (
              <p className="text-xs text-brand-red">Add a badge picture before deploying — the NFT can&apos;t be created without one.</p>
            )}
            <button
              type="submit"
              disabled={submitting || !imageDataUrl}
              className="pill-light h-11 self-start px-6 text-sm disabled:opacity-50"
            >
              {deployStep === "deploying"
                ? "Deploying contract…"
                : deployStep === "saving"
                  ? "Saving drop…"
                  : copy.submitLabel}
            </button>
            <p className="text-xs text-muted-foreground/70">
              Creating a badge deploys its own contract from your wallet — you&apos;ll be asked to
              approve a small AVAX gas fee.
            </p>
          </div>
        </form>

        <aside className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Preview
            </span>
            <EventBadge title={title || "Your Event"} imageUrl={imageDataUrl || undefined} size={160} />
          </div>

          <div className="flex flex-col gap-3">
            <span className="brand-kicker text-muted-foreground">{copy.yourDropsKicker}</span>

            {activeEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">{copy.noActiveDrops}</p>
            )}

            {activeEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-heading font-bold text-sm tracking-wide text-foreground">
                    {event.title}
                  </h3>
                  <span className="whitespace-nowrap rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
                    Open
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-md bg-brand-mist px-3 py-1.5 text-center font-mono text-sm font-bold tracking-[0.25em] text-brand-ink">
                    {event.secretCode}
                  </span>
                  <button
                    onClick={() => copyCode(event.id, event.secretCode)}
                    className="pill-outline-light whitespace-nowrap px-2 py-1.5 text-[11px] font-medium"
                  >
                    {copiedId === event.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                <button
                  onClick={() => copyLink(event.id, `${origin}${claimBasePath}/${event.slug}`)}
                  className="pill-outline-light px-2 py-1.5 text-[11px] font-medium"
                >
                  {copiedLinkId === event.id ? "Link copied!" : "Copy claim link"}
                </button>

                <p className="text-[11px] text-muted-foreground/70">
                  Claimed {event.claimedCount}
                  {typeof event.maxSupply === "number" ? ` / ${event.maxSupply}` : " · unlimited"}
                </p>

                <p className="text-[11px] text-muted-foreground/70">
                  Claim closes {formatDate(event.expiresAt)}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={MAX_SUPPLY_CAP}
                    step="1"
                    aria-label={`Max supply for ${event.title}`}
                    value={supplyDrafts[event.id] ?? String(event.maxSupply ?? "")}
                    onChange={(e) =>
                      setSupplyDrafts((current) => ({ ...current, [event.id]: e.target.value }))
                    }
                    className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-foreground focus:border-white/40 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSupplyUpdate(event)}
                    disabled={updatingSupplyId === event.id}
                    className="pill-outline-light whitespace-nowrap px-2 py-1.5 text-[11px] font-medium disabled:opacity-50"
                  >
                    {updatingSupplyId === event.id ? "Saving…" : "Update supply"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={extendDrafts[event.id] ?? ""}
                    onChange={(e) =>
                      setExtendDrafts((current) => ({ ...current, [event.id]: e.target.value }))
                    }
                    className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-foreground focus:border-white/40 focus:outline-none"
                  />
                  <button
                    onClick={() => handleExtend(event.id)}
                    disabled={extendingId === event.id}
                    className="pill-outline-light whitespace-nowrap px-2 py-1.5 text-[11px] font-medium disabled:opacity-50"
                  >
                    {extendingId === event.id ? "Extending…" : "Extend"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {extendError && <p className="text-sm text-brand-red">{extendError}</p>}
          {supplyError && <p className="text-sm text-brand-red">{supplyError}</p>}

          {historyEvents.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border pt-6">
              <span className="brand-kicker mb-2 text-muted-foreground/70">History</span>
              {historyEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Link
                    href={`${claimBasePath}/${event.slug}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{event.title}</span>
                    <span className="whitespace-nowrap text-muted-foreground/70">
                      Closed {formatDate(event.expiresAt)}
                    </span>
                  </Link>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={extendDrafts[event.id] ?? ""}
                      onChange={(e) =>
                        setExtendDrafts((current) => ({ ...current, [event.id]: e.target.value }))
                      }
                      className="flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-foreground focus:border-white/40 focus:outline-none"
                    />
                    <button
                      onClick={() => handleExtend(event.id)}
                      disabled={extendingId === event.id}
                      className="pill-outline-light whitespace-nowrap px-2 py-1.5 text-[11px] font-medium disabled:opacity-50"
                    >
                      {extendingId === event.id ? "Extending…" : "Extend"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
