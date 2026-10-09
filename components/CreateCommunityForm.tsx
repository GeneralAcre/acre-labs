"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { MemberCard } from "@/components/MemberCard";
import { useOwnerSession } from "@/lib/useOwnerSession";
import { DEFAULT_ACCENT_COLOR, DEFAULT_CARD_COLOR } from "@/lib/color";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cardColor, setCardColor] = useState(DEFAULT_CARD_COLOR);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [issueDate, setIssueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDate] = useState(() => Date.now());

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, cardColor, accentColor, issueDate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't create the community.");
        return;
      }
      router.push(`/content/${data.community.slug}`);
    } catch {
      setError("Couldn't create the community.");
    } finally {
      setSubmitting(false);
    }
  }

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
    <section className="mx-auto grid w-full max-w-[1400px] flex-1 gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1fr_440px]">
      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-5">
        <label className={labelClass}>
          Community name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="e.g. Team1 Thailand" className={inputClass} />
        </label>
        <label className={labelClass}>
          Description <span className="font-normal normal-case tracking-normal text-muted-foreground/70">Optional</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="What's this community about?"
            className="font-normal normal-case tracking-normal resize-none rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm"
          />
        </label>

        <label className={labelClass}>
          <span>
            Date of issue{" "}
            <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
              Optional · printed on every card — leave empty to use each member&apos;s join date
            </span>
          </span>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={`${inputClass} max-w-xs [color-scheme:dark]`}
          />
        </label>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Card design</legend>
          <p className="-mt-1 text-xs text-muted-foreground/70">
            Every card keeps the same ID layout — pick the colors for this event.
          </p>
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
            <ColorInput label="Card background" value={cardColor} onChange={setCardColor} />
            <ColorInput label="Title & footer" value={accentColor} onChange={setAccentColor} />
          </div>
        </fieldset>

        {error && <p className="text-sm text-brand-red">{error}</p>}

        <button type="submit" disabled={submitting || !name.trim()} className="pill-light h-11 self-start px-6 text-sm disabled:pointer-events-none disabled:opacity-50">
          {submitting ? "Creating…" : "Create community"}
        </button>
      </form>

      <aside className="flex flex-col items-center gap-3">
        <span className="brand-kicker text-muted-foreground">Card preview</span>
        <MemberCard
          preview
          id="community-preview"
          memberNo={1}
          communityName={name.trim() || "Your community"}
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
          Every member gets a card like this with their own name, handle and picture.
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
