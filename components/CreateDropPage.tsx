"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import type { EventRecord, Product } from "@/lib/types";
import { EventBadge } from "@/components/EventBadge";
import { useWallet } from "@/components/WalletProvider";
import { Web3ClaimError } from "@/lib/web3/wallet";
import { useOrigin } from "@/lib/useOrigin";
import { useOwnerSession } from "@/lib/useOwnerSession";
import { compressSquareImage } from "@/lib/image";
import { deployDropContract } from "@/lib/web3/factory";
import { DROP_FACTORY_ADDRESS } from "@/lib/web3/chains";

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
    connectSubtext: string;
    submitLabel: string;
  }
> = {
  badge: {
    newDropKicker: "New Badge",
    heading: "Create a Badge",
    pictureLabel: "Badge Picture",
    connectSubtext: "Manage the badges you create.",
    submitLabel: "Create badge",
  },
  content: {
    newDropKicker: "New Pass",
    heading: "Host a Hackathon",
    pictureLabel: "Pass Artwork",
    connectSubtext: "Manage the hackathons you host.",
    submitLabel: "Create pass",
  },
};

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

  // Creating a drop (POST /api/events) requires proof of wallet ownership — a
  // one-time signature per session, not a per-request cost. Managing existing
  // drops (codes, supply, deadline) lives on the owner's profile.
  const { sessionChecked, isAuthenticated, signingIn, authError, signIn: handleSignIn } = useOwnerSession();

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
  // The drop just created, shown with its claim code until the next one.
  const [created, setCreated] = useState<EventRecord | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const origin = useOrigin();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCreated(null);

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
      setCreated(data.event);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Web3ClaimError ? err.message : "Failed to create badge.");
    } finally {
      setSubmitting(false);
      setDeployStep("idle");
    }
  }

  async function copyToClipboard(kind: "code" | "link", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1500);
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

  const claimUrl = created ? `${origin}${claimBasePath}/${created.slug}` : "";
  const labelClass = "text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground";
  const inputClass =
    "rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm";
  const endDateLabel = eventEndDate ? new Date(`${eventEndDate}T00:00`).toLocaleDateString(undefined, { dateStyle: "medium" }) : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      {created && (
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#21c45d]/30 bg-[#21c45d]/[0.06] p-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <EventBadge title={created.title} imageUrl={created.imageUrl} size={56} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">&ldquo;{created.title}&rdquo; is live</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share the claim code with attendees. Manage supply and deadline anytime from your profile.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-mist px-3 py-2 font-mono text-base font-bold tracking-[0.3em] text-brand-ink">
              {created.secretCode}
            </span>
            <button type="button" onClick={() => copyToClipboard("code", created.secretCode)} className="pill-outline-light h-10 px-3 text-xs font-medium">
              {copied === "code" ? "Copied!" : "Copy code"}
            </button>
            <button type="button" onClick={() => copyToClipboard("link", claimUrl)} className="pill-outline-light h-10 px-3 text-xs font-medium">
              {copied === "link" ? "Link copied!" : "Copy claim link"}
            </button>
            <Link href="/profile" className="pill-light h-10 px-4 text-xs">
              Manage on profile
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
          <div>
            <span className="brand-kicker text-muted-foreground">{copy.newDropKicker}</span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{copy.heading}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload the badge art, fill in the event details, and deploy — attendees claim it with a code.
            </p>
          </div>

          {/* Picture first — the badge can't be deployed without it. */}
          <div className="flex flex-col gap-2">
            <label htmlFor="picture" className={labelClass}>
              {copy.pictureLabel} <span className="text-brand-red">*</span>
            </label>
            <div
              className={`flex items-center gap-4 rounded-xl border bg-white/[0.04] p-4 ${
                imageDataUrl ? "border-white/[0.08]" : "border-dashed border-brand-red/50"
              }`}
            >
              <EventBadge title={title || "?"} imageUrl={imageDataUrl || undefined} size={64} className="shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <input
                  ref={fileInputRef}
                  id="picture"
                  type="file"
                  accept="image/*"
                  required={!imageDataUrl}
                  onChange={handlePictureChange}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                />
                {imageDataUrl ? (
                  <p className="text-xs text-[#21c45d]">Picture added ✓</p>
                ) : (
                  <p className="text-xs text-brand-red">Required — the NFT can&apos;t be created without a picture.</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Square image, at least 512 × 512 px · PNG or JPG, up to 20 MB. Other shapes are cropped to the center.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="title" className={labelClass}>Event title</label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Team1 x KU : Introduction to Blockchain"
              className={`${inputClass} text-lg font-semibold sm:text-lg`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="location" className={labelClass}>Location</label>
            <input
              id="location"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bangkok, Thailand"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What was this event about?"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="eventEndDate" className={labelClass}>Event end date</label>
              <input
                id="eventEndDate"
                type="date"
                required
                value={eventEndDate}
                onChange={(e) => setEventEndDate(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
              <p className="text-xs text-muted-foreground/70">Claim stays open through the next day.</p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="maxSupply" className={labelClass}>Max supply</label>
              <input
                id="maxSupply"
                type="number"
                min={1}
                max={MAX_SUPPLY_CAP}
                step={1}
                required
                value={maxSupply}
                onChange={(e) => setMaxSupply(e.target.value)}
                placeholder="e.g. 30"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground/70">
                Up to {MAX_SUPPLY_CAP}. Claiming closes early once reached.
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <div className="flex flex-col items-start gap-2 border-t border-border pt-6">
            <button
              type="submit"
              disabled={submitting || !imageDataUrl}
              className="pill-light h-11 px-6 text-sm disabled:pointer-events-none disabled:opacity-50"
            >
              {deployStep === "deploying"
                ? "Deploying contract…"
                : deployStep === "saving"
                  ? "Saving drop…"
                  : copy.submitLabel}
            </button>
            <p className="text-xs text-muted-foreground/70">
              Creating a badge deploys its own contract from your wallet — you&apos;ll be asked to approve a small AVAX gas fee.
            </p>
          </div>
        </form>

        <aside className="lg:self-start">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6 text-center">
            <span className={labelClass}>Preview</span>
            <div className="rounded-full shadow-[0_0_60px_-12px_rgba(60,131,246,0.55)]">
              <EventBadge title={title || "Your Event"} imageUrl={imageDataUrl || undefined} size={176} />
            </div>
            <div className="w-full min-w-0">
              <p className="line-clamp-2 text-lg font-bold tracking-tight text-foreground">{title.trim() || "Your event title"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[location.trim() || "Location", endDateLabel ? `Ends ${endDateLabel}` : "End date"].join(" · ")}
              </p>
            </div>
            <div className="w-full rounded-xl border border-border bg-secondary px-4 py-3">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <span>Claimed</span>
                <span className="text-foreground">0 / {maxSupply.trim() || "—"}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-accent" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
