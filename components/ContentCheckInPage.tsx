"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CheckInRecord } from "@/lib/types";
import { CheckInCard } from "@/components/CheckInCard";

export function ContentCheckInPage() {
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myCheckIn, setMyCheckIn] = useState<CheckInRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/checkins");
      const data = await res.json();
      if (!cancelled) {
        setCheckIns(data.checkIns ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, xHandle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setCheckIns((prev) => [data.checkIn, ...prev]);
      setMyCheckIn(data.checkIn);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-brand-mist/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_35%,rgba(216,8,25,0.36),transparent_25rem)]" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-start">
          <span className="brand-kicker text-brand-mist/60">02 / Project</span>
          <h1 className="mt-5 font-heading text-7xl uppercase leading-[0.8] tracking-[-0.055em] text-brand-mist sm:text-8xl">
            Content
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-brand-mist/75 sm:text-lg">
            You&apos;re here. Drop your name and X handle to check in — everyone below showed up
            too.
          </p>

          {myCheckIn ? (
            <div className="mt-10 flex flex-col items-start gap-4">
              <p className="text-sm text-brand-mist/70">Here&apos;s your pass — screenshot it or find it below.</p>
              <CheckInCard
                name={myCheckIn.name}
                xHandle={myCheckIn.xHandle}
                checkedInAt={myCheckIn.createdAt}
                className="w-full max-w-xs"
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-10 flex w-full max-w-md flex-col gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                maxLength={60}
                required
                className="h-12 border border-brand-mist/20 bg-transparent px-5 text-sm text-brand-mist placeholder:text-brand-mist/40 focus:border-brand-mist/50 focus:outline-none"
              />
              <div className="flex h-12 items-center gap-1 border border-brand-mist/20 px-5 focus-within:border-brand-mist/50">
                <span className="text-sm text-brand-mist/50">@</span>
                <input
                  value={xHandle}
                  onChange={(event) => setXHandle(event.target.value)}
                  placeholder="X handle"
                  maxLength={15}
                  required
                  className="h-full flex-1 bg-transparent text-sm text-brand-mist placeholder:text-brand-mist/40 focus:outline-none"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="pill-light h-12 px-7 text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Checking in…" : "Check in"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10">
        <span className="brand-kicker text-brand-mist/60">Who&apos;s here</span>
        <h2 className="mt-3 font-heading text-2xl uppercase text-brand-mist">
          {checkIns.length} checked in
        </h2>

        {loading && <p className="mt-6 text-sm text-brand-mist/60">Loading…</p>}
        {!loading && checkIns.length === 0 && (
          <p className="mt-6 text-sm text-brand-mist/60">
            No one&apos;s checked in yet — be the first.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {checkIns.map((checkIn) => (
            <CheckInCard
              key={checkIn.id}
              name={checkIn.name}
              xHandle={checkIn.xHandle}
              checkedInAt={checkIn.createdAt}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
