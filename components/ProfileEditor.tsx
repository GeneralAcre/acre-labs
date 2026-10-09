"use client";

import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import type { ProfileRecord } from "@/lib/types";
import { useOwnerSession } from "@/lib/useOwnerSession";

// Inline editor for the signed-in wallet's display name.
export function ProfileEditor({
  profile,
  onSaved,
}: {
  profile: ProfileRecord | null;
  onSaved: (profile: ProfileRecord) => void;
}) {
  const { isAuthenticated, signingIn, authError, signIn } = useOwnerSession();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setDisplayName(profile?.displayName ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, xHandle: "" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't save your profile.");
        return;
      }
      onSaved(data.profile);
      setOpen(false);
    } catch {
      setError("Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="pill-outline-light h-9 gap-1.5 px-3 text-xs font-medium"
      >
        <Pencil className="size-3.5" />
        {profile?.displayName ? "Edit profile" : "Set your name"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-md flex-col gap-3 rounded-xl border border-border bg-background/60 p-4">
      <label className="flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Display name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          autoFocus
          className="h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-base font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm"
        />
      </label>

      {(error || authError) && <p className="text-sm text-brand-red">{error ?? authError}</p>}

      <div className="flex gap-2">
        {isAuthenticated ? (
          <button type="submit" disabled={saving} className="pill-light h-10 px-4 text-sm disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        ) : (
          <button type="button" onClick={signIn} disabled={signingIn} className="pill-light h-10 px-4 text-sm disabled:opacity-50">
            {signingIn ? "Check your wallet…" : "Sign in to save"}
          </button>
        )}
        <button type="button" onClick={() => setOpen(false)} className="pill-outline-light h-10 px-4 text-sm">
          Cancel
        </button>
      </div>
      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground/70">One signature, no gas — proves this wallet is yours.</p>
      )}
    </form>
  );
}
