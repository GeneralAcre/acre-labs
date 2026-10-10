"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";
import { useWallet } from "@/components/WalletProvider";
import { MemberCard } from "@/components/MemberCard";
import { useOwnerSession } from "@/lib/useOwnerSession";
import { compressCardBackground, compressSquareImage } from "@/lib/image";
import { DEFAULT_ACCENT_COLOR, DEFAULT_CARD_COLOR } from "@/lib/color";
import { CARD_PREFIX_RE, memberIdLabel, normalizeCardPrefix } from "@/lib/memberId";
import type { CardKind } from "@/lib/types";

// Starting points for the card template — same layout, different colors,
// like a school ID restyled each year. Creators can also pick any color.
const PRESETS: { name: string; card: string; accent: string }[] = [
  { name: "Classic", card: DEFAULT_CARD_COLOR, accent: DEFAULT_ACCENT_COLOR },
  { name: "Avalanche", card: "#ffffff", accent: "#e84142" },
  { name: "Ocean", card: "#eaf2ff", accent: "#3c83f6" },
  { name: "Forest", card: "#eef7ee", accent: "#1f8a4c" },
  { name: "Sunset", card: "#fff4e6", accent: "#f97316" },
  { name: "Midnight", card: "#111111", accent: "#f6c65b" },
  { name: "Grape", card: "#f5efff", accent: "#7c3aed" },
  { name: "Bubblegum", card: "#fff0f6", accent: "#db2777" },
];

const inputClass =
  "font-normal normal-case tracking-normal h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm";
const labelClass = "flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground";

// Anyone can host a community: one wallet signature (so "Created by" is
// real), a name and the card colors. Members then make their own cards on the
// community's page — no wallet needed for them.
export function CreateCommunityForm() {
  const router = useRouter();
  const { address } = useWallet();
  const { sessionChecked, isAuthenticated, signingIn, authError, signIn } = useOwnerSession();
  // Member ID cards or event passes — switched at the top of the form.
  const [kind, setKind] = useState<CardKind>("community");
  const [place, setPlace] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cardColor, setCardColor] = useState(DEFAULT_CARD_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [issueDate, setIssueDate] = useState("");
  const [cardPrefix, setCardPrefix] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDate] = useState(() => Date.now());
  const prefixInvalid = cardPrefix !== "" && !CARD_PREFIX_RE.test(cardPrefix);
  const [cardImage, setCardImage] = useState("");
  // Result of the last "is this name free?" check, tied to the name it was for
  // so a stale answer never shows against what's typed now.
  const [nameCheck, setNameCheck] = useState<{ name: string; takenBy: string | null }>({ name: "", takenBy: null });
  const trimmedName = name.trim();
  const nameTakenBy = nameCheck.name === trimmedName ? nameCheck.takenBy : null;

  useEffect(() => {
    if (!trimmedName) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/communities?name=${encodeURIComponent(trimmedName)}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (!cancelled && data) setNameCheck({ name: trimmedName, takenBy: data.takenBy ?? null });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedName]);

  async function handleCardImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { dataUrl, averageColor } = await compressCardBackground(file);
      setCardImage(dataUrl);
      // Tint with the picture's own average color so the wash is subtle and
      // the text color (picked from it) reads well on the picture.
      setCardColor(averageColor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    }
  }

  async function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setImageUrl(await compressSquareImage(file, 512));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, cardColor, accentColor, issueDate, cardPrefix, kind, place, cardImage: cardImage || undefined, imageUrl: imageUrl || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Couldn't create the ${noun}.`);
        return;
      }
      router.push(`/content/${data.community.slug}`);
    } catch {
      setError(`Couldn't create the ${noun}.`);
    } finally {
      setSubmitting(false);
    }
  }

  const event = kind === "event";
  const noun = event ? "event" : "community";
  const previewName = trimmedName || (event ? "Your event" : "Your community");

  if (!address) {
    return (
      <section className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Connect your wallet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Creating a community is tied to your wallet so members can see who runs it. Use the button at the top of the page.
        </p>
      </section>
    );
  }

  if (!sessionChecked) return null;

  if (!isAuthenticated) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">Sign in to create</h2>
        <p className="text-sm text-muted-foreground">One signature, no gas — proves the community is yours.</p>
        <button type="button" onClick={signIn} disabled={signingIn} className="pill-light mt-2 h-11 px-6 text-sm disabled:opacity-50">
          {signingIn ? "Check your wallet…" : "Sign in"}
        </button>
        {authError && <p className="text-sm text-brand-red">{authError}</p>}
      </section>
    );
  }

  return (
    <section className="mx-auto grid grid-cols-1 w-full max-w-[1400px] flex-1 gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_440px]">
      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
        <div role="radiogroup" aria-label="Card type" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          {KINDS.map(({ value, title, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                kind === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {title}
            </button>
          ))}
        </div>
        <label className={labelClass}>
          {event ? "Event name" : "Community name"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            placeholder={event ? "e.g. Team1 x KU: Intro to Blockchain" : "e.g. Team1 Thailand"}
            aria-invalid={nameTakenBy !== null}
            className={inputClass}
          />
          {nameTakenBy && (
            <span role="alert" className="text-xs font-normal normal-case tracking-normal text-brand-red">
              &ldquo;{nameTakenBy}&rdquo; already exists — pick a different name.
            </span>
          )}
        </label>
        <label className={labelClass}>
          Description <span className="font-normal normal-case tracking-normal text-muted-foreground/70">Optional</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder={event ? "What's this event about?" : "What's this community about?"}
            className="font-normal normal-case tracking-normal resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm"
          />
        </label>

        <label className={labelClass}>
          <span>
            Logo{" "}
            <span className="text-sm font-normal normal-case tracking-normal text-muted-foreground">
              Optional · square, at least 512 × 512 px — a transparent PNG looks best
            </span>
          </span>
          <span className="flex items-center gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data: URI preview
              <img src={imageUrl} alt="" className="size-10 object-contain" />
            ) : (
              <span className="size-10 rounded-lg bg-white/[0.06]" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogo}
              className="min-w-0 flex-1 text-xs font-normal normal-case tracking-normal text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
            />
            {imageUrl && (
              <button type="button" onClick={() => setImageUrl("")} className="text-xs font-normal normal-case tracking-normal text-muted-foreground hover:text-foreground">
                Remove
              </button>
            )}
          </span>
        </label>

        {event && (
          <label className={labelClass}>
            <span>
              Place <span className="font-normal normal-case tracking-normal text-muted-foreground/70">Optional · printed on every pass</span>
            </span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={80}
              placeholder="e.g. Kasetsart University, Bangkok"
              className={inputClass}
            />
          </label>
        )}

        <label className={labelClass}>
          <span>
            {event ? "Event date" : "Date of issue"}{" "}
            <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
              {event
                ? "Optional · printed on every pass — leave empty to use the day each person gets theirs"
                : "Optional · printed on every card — leave empty to use each member’s join date"}
            </span>
          </span>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={`${inputClass} max-w-xs [color-scheme:dark]`}
          />
        </label>

        <label className={labelClass}>
          <span>
            Card number prefix{" "}
            <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
              Optional · 2–3 letters or numbers — {event ? "passes" : "members"} are numbered in join order, e.g.{" "}
              {memberIdLabel(previewName, 1, cardPrefix)},{" "}
              {memberIdLabel(previewName, 2, cardPrefix)}…
            </span>
          </span>
          <input
            value={cardPrefix}
            onChange={(e) => setCardPrefix(normalizeCardPrefix(e.target.value))}
            maxLength={3}
            placeholder={memberIdLabel(previewName, 1).split("-")[0]}
            aria-invalid={prefixInvalid}
            className={`${inputClass} max-w-[8rem] font-mono uppercase`}
          />
          {prefixInvalid && (
            <span className="text-xs font-normal normal-case tracking-normal text-brand-red">Use at least 2 characters.</span>
          )}
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Card design</legend>
          <p className="-mt-1 text-xs text-muted-foreground/70">
            Every card keeps the same ID layout — pick the colors for this event, or use a picture as the background.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              Background picture{" "}
              <span className="text-muted-foreground/70">Optional · landscape, at least 1240 × 800 px — cropped to the card</span>
            </span>
            <span className="flex items-center gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              {cardImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data: URI preview
                <img src={cardImage} alt="" className="h-10 w-[62px] rounded object-cover" />
              ) : (
                <span className="h-10 w-[62px] rounded bg-white/[0.06]" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleCardImage}
                className="min-w-0 flex-1 text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
              {cardImage && (
                <button type="button" onClick={() => setCardImage("")} className="text-xs text-muted-foreground hover:text-foreground">
                  Remove
                </button>
              )}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const selected = preset.card === cardColor && preset.accent === accentColor;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setCardColor(preset.card);
                    setAccentColor(preset.accent);
                  }}
                  aria-pressed={selected}
                  title={preset.name}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selected ? "border-foreground/60 bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex h-5 w-8 flex-col overflow-hidden rounded border border-white/20">
                    <span className="flex-1" style={{ backgroundColor: preset.card }} />
                    <span className="h-1.5" style={{ backgroundColor: preset.accent }} />
                  </span>
                  {preset.name}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <ColorInput label={cardImage ? "Picture tint" : "Card background"} value={cardColor} onChange={setCardColor} />
            <ColorInput label="Title & footer" value={accentColor} onChange={setAccentColor} />
          </div>
        </fieldset>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <button type="submit" disabled={submitting || !trimmedName || prefixInvalid || nameTakenBy !== null} className="pill-light h-11 self-start px-6 text-sm disabled:pointer-events-none disabled:opacity-50">
          {submitting ? "Creating…" : event ? "Create event" : "Create community"}
        </button>
      </form>

      <aside className="flex flex-col items-center gap-3">
        <span className="brand-kicker text-muted-foreground">Card preview</span>
        <MemberCard
          preview
          id="community-preview"
          memberNo={1}
          communityName={previewName}
          kind={kind}
          place={place.trim() || null}
          communityLogo={imageUrl || null}
          cardPrefix={cardPrefix || null}
          cardImage={cardImage || null}
          name="Member name"
          xHandle="member"
          avatarUrl={null}
          cardColor={cardColor}
          accentColor={accentColor}
          issuedAt={issueDate ? new Date(`${issueDate}T12:00:00.000Z`).getTime() : null}
          joinedAt={previewDate}
          className="w-full"
        />
        <p className="max-w-xs text-center text-xs text-muted-foreground/70">
          {event
            ? "Everyone who joins gets a pass like this with their own name, handle and picture."
            : "Every member gets a card like this with their own name, handle and picture."}
        </p>
      </aside>
    </section>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-foreground">{label}</span>
        <span className="block font-mono text-[10px] uppercase text-muted-foreground">{value}</span>
      </span>
    </label>
  );
}

const KINDS: { value: CardKind; title: string; Icon: typeof Users }[] = [
  {
    value: "community",
    title: "Community card",
    Icon: Users,
  },
  {
    value: "event",
    title: "Event card",
    Icon: CalendarDays,
  },
];
