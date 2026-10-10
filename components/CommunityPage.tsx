"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CheckInRecord, CommunityRecord } from "@/lib/types";
import { MemberCard } from "@/components/MemberCard";
import { compressSquareImage } from "@/lib/image";

const inputClass =
  "font-normal normal-case tracking-normal h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-white/40 focus:outline-none sm:text-sm";
const labelClass = "flex flex-col gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground";

const AVATAR_MAX_DIMENSION = 256;
// Card numbers print as four digits (e.g. KU-0042).
const MAX_MEMBER_NO = 9999;

export function CommunityPage({ slug }: { slug: string }) {
  const [community, setCommunity] = useState<CommunityRecord | null>(null);
  const [members, setMembers] = useState<CheckInRecord[]>([]);
  const [stage, setStage] = useState<"loading" | "ready" | "not_found">("loading");
  const [name, setName] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [role, setRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  // The member picks their own card number; null until they type, so the
  // field shows the lowest free number.
  const [memberNoInput, setMemberNoInput] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myCard, setMyCard] = useState<CheckInRecord | null>(null);
  // Fixed at mount so the preview card's date doesn't change on every keystroke.
  const [previewDate] = useState(() => Date.now());

  const takenNumbers = new Set(members.map((member) => member.memberNo));
  let nextFreeNumber = 1;
  while (takenNumbers.has(nextFreeNumber)) nextFreeNumber++;
  const memberNoValue = memberNoInput ?? String(nextFreeNumber);
  const memberNo = Number(memberNoValue);
  const memberNoValid = /^d+$/.test(memberNoValue) && memberNo >= 1 && memberNo <= MAX_MEMBER_NO;
  const memberNoTaken = memberNoValid && takenNumbers.has(memberNo);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/communities/${encodeURIComponent(slug)}`);
      if (cancelled) return;
      if (!res.ok) {
        setStage("not_found");
        return;
      }
      const data = await res.json();
      if (cancelled) return;
      setCommunity(data.community);
      setMembers(data.members ?? []);
      setStage("ready");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setAvatarUrl(await compressSquareImage(file, AVATAR_MAX_DIMENSION));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that picture.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(slug)}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, xHandle, role, avatarUrl: avatarUrl || null, memberNo: Number(memberNoValue) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setMembers((prev) => [data.member, ...prev]);
      setMyCard(data.member);
      setName("");
      setXHandle("");
      setRole("");
      setAvatarUrl("");
      setMemberNoInput(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "loading") {
    return (
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
        <div className="h-24 max-w-md animate-pulse rounded-xl bg-card motion-reduce:animate-none" />
      </main>
    );
  }

  if (stage === "not_found" || !community) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Community not found</h1>
        <p className="text-sm text-muted-foreground">Double-check the link, or browse all communities.</p>
        <Link href="/content" className="pill-light h-11 px-5 text-sm">All communities</Link>
      </main>
    );
  }

  const event = community.kind === "event";
  const person = event ? "attendee" : "member";
  const memberLabel = `${members.length} ${person}${members.length === 1 ? "" : "s"}`;

  return (
    <main className="flex flex-1 flex-col bg-background">
      {/* Title on top */}
      <header className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 sm:pt-8">
        <Link href="/content" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" /> All communities
        </Link>
        <div className="mt-5 flex items-start gap-4">
          {community.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URI / local logo
            <img src={community.imageUrl} alt="" className="size-14 shrink-0 rounded-xl border border-border bg-black/40 object-contain p-1.5 sm:size-16" />
          ) : null}
          <div className="min-w-0">
            <span className="brand-kicker text-muted-foreground">{event ? "Event" : "Community"}</span>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{community.name}</h1>
          </div>
        </div>
        {community.description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{community.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">
            Created by{" "}
            {community.ownerAddress ? (
              <Link href={`/profile/${community.ownerAddress}`} className="text-foreground hover:underline">
                {community.creatorName}
              </Link>
            ) : (
              <span className="text-foreground">{community.creatorName}</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-foreground">
            {members.length > 0 && <span className="live-dot" aria-hidden="true" />}
            {memberLabel}
          </span>
        </div>
      </header>

      {/* Card left, form right */}
      <section className="mx-auto grid grid-cols-1 w-full max-w-[1400px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-[radial-gradient(ellipse_at_50%_35%,rgba(60,131,246,0.14),transparent_65%)] py-6">
          <span className="brand-kicker text-muted-foreground">{myCard ? (event ? "Your event pass" : "Your ID card") : "Live preview"}</span>
          {myCard ? (
            <MemberCard
              id={myCard.id}
              memberNo={myCard.memberNo}
              communityName={community.name}
              communityLogo={community.imageUrl}
              communitySlug={community.slug}
              cardPrefix={community.cardPrefix}
              cardImage={community.cardImage}
              kind={community.kind}
              place={community.place}
              cardColor={community.cardColor}
              accentColor={community.accentColor}
              issuedAt={community.issueDate}
              name={myCard.name}
              xHandle={myCard.xHandle}
              avatarUrl={myCard.avatarUrl}
              role={myCard.role}
              joinedAt={myCard.createdAt}
              className="w-full max-w-lg"
            />
          ) : (
            <MemberCard
              preview
              id={`preview-${community.id}`}
              memberNo={memberNoValid ? memberNo : nextFreeNumber}
              communityName={community.name}
              communityLogo={community.imageUrl}
              communitySlug={community.slug}
              cardPrefix={community.cardPrefix}
              cardImage={community.cardImage}
              kind={community.kind}
              place={community.place}
              cardColor={community.cardColor}
              accentColor={community.accentColor}
              issuedAt={community.issueDate}
              name={name.trim() || "Your name"}
              xHandle={xHandle.trim().replace(/^@/, "") || "yourhandle"}
              avatarUrl={avatarUrl || null}
              role={role.trim() || null}
              joinedAt={previewDate}
              className="w-full max-w-lg"
            />
          )}
        </div>

        <div className="flex flex-col justify-center">
          {myCard ? (
            <div>
              <h2 className="text-2xl font-bold tracking-tight">You&apos;re in</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your {event ? "pass" : "card"} is on the {community.name} wall below. Add your X handle on your profile to earn leaderboard points for it.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/profile" className="pill-light h-11 px-5 text-sm">Go to profile</Link>
                <button type="button" onClick={() => setMyCard(null)} className="pill-outline-light h-11 px-5 text-sm font-semibold">
                  Make another card
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight">{event ? "Get your event pass" : "Get your ID card"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill in your details — the card on the left updates as you type. No wallet needed.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 flex max-w-md flex-col gap-4">
                <label className={labelClass}>
                  Name
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  X handle
                  <span className="flex h-11 items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 focus-within:border-white/40">
                    <span className="text-sm font-normal text-muted-foreground">@</span>
                    <input
                      value={xHandle}
                      onChange={(e) => setXHandle(e.target.value)}
                      placeholder="yourhandle"
                      maxLength={16}
                      required
                      className="h-full min-w-0 flex-1 bg-transparent pl-1 text-base font-normal normal-case tracking-normal text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm"
                    />
                  </span>
                </label>
                <label className={labelClass}>
                  <span>
                    Card number{" "}
                    <span className="font-normal normal-case tracking-normal text-muted-foreground/70">Pick any free number, 1–{MAX_MEMBER_NO}</span>
                  </span>
                  <input
                    value={memberNoValue}
                    onChange={(e) => setMemberNoInput(e.target.value.replace(/D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    maxLength={4}
                    required
                    aria-invalid={!memberNoValid || memberNoTaken}
                    className={`${inputClass} max-w-[8rem] font-mono`}
                  />
                  {memberNoTaken && (
                    <span role="alert" className="text-xs font-normal normal-case tracking-normal text-brand-red">
                      #{memberNo} is taken — next free number is {nextFreeNumber}.
                    </span>
                  )}
                </label>
                {/* Event passes have no role — the card shows the place instead. */}
                {!event && (
                  <label className={labelClass}>
                    <span>
                      Role <span className="font-normal normal-case tracking-normal text-muted-foreground/70">Optional · e.g. Builder, Speaker</span>
                    </span>
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Member" maxLength={30} className={inputClass} />
                  </label>
                )}
                <label className={labelClass}>
                  <span>
                    Profile picture{" "}
                    <span className="text-sm font-normal normal-case tracking-normal text-muted-foreground">
                      Optional · square photo, at least 256 × 256 px
                    </span>
                  </span>
                  <span className="flex items-center gap-4 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local data: URI preview
                      <img src={avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      <span className="size-10 rounded-full bg-white/[0.06]" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatar}
                      className="min-w-0 flex-1 text-xs font-normal normal-case tracking-normal text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                    />
                    {avatarUrl && (
                      <button type="button" onClick={() => setAvatarUrl("")} className="text-xs font-normal normal-case tracking-normal text-muted-foreground hover:text-foreground">
                        Remove
                      </button>
                    )}
                  </span>
                </label>
                {error && <p role="alert" className="text-sm text-brand-red">{error}</p>}
                <button type="submit" disabled={submitting || !memberNoValid || memberNoTaken} className="pill-light h-11 self-start px-6 text-sm disabled:opacity-50">
                  {submitting ? (event ? "Creating your pass…" : "Creating your card…") : event ? "Get my pass" : "Get my card"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Member wall */}
      <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-12 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{event ? "Attendees" : "Members"}</h2>
          <span className="text-xs font-medium text-muted-foreground">{memberLabel}</span>
        </div>
        {members.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            No {event ? "passes" : "member cards"} yet — be the first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard
                key={member.id}
                id={member.id}
                memberNo={member.memberNo}
                communityName={community.name}
                communityLogo={community.imageUrl}
                communitySlug={community.slug}
                cardPrefix={community.cardPrefix}
                cardImage={community.cardImage}
                kind={community.kind}
                place={community.place}
                cardColor={community.cardColor}
                accentColor={community.accentColor}
                issuedAt={community.issueDate}
                name={member.name}
                xHandle={member.xHandle}
                avatarUrl={member.avatarUrl}
                role={member.role}
                joinedAt={member.createdAt}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
