"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CheckInRecord, CommunityRecord } from "@/lib/types";
import { MemberCard } from "@/components/MemberCard";

type Card = { community: CommunityRecord; member: CheckInRecord };

// Community member cards don't belong to a wallet — they're linked to a
// profile through its X handle, the same link the leaderboard uses.
export function ProfileMemberCards({ xHandle, isMe }: { xHandle: string | null; isMe: boolean }) {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    if (!xHandle) return;
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/communities/cards?handle=${encodeURIComponent(xHandle!)}`);
      const data = await res.json().catch(() => ({ cards: [] }));
      if (!cancelled) setCards(data.cards ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [xHandle]);

  // Nothing to show for other people's profiles without a linked handle.
  if (!xHandle && !isMe) return null;

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <span className="brand-kicker text-muted-foreground">Content</span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">Member cards</h2>
        </div>
        <Link href="/content" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          Get a card
        </Link>
      </div>

      {!xHandle ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Your member cards show up here once your X handle is linked. Open{" "}
          <span className="font-medium text-foreground">Set your name</span> (or{" "}
          <span className="font-medium text-foreground">Edit profile</span>) above and add the X handle you used on your card.
        </p>
      ) : cards === null ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          <div className="aspect-[1.55/1] animate-pulse rounded-xl bg-card motion-reduce:animate-none" />
        </div>
      ) : cards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          No member cards made with @{xHandle} yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          {cards.map(({ community, member }) => (
            <div key={member.id} className="flex flex-col gap-2">
              <MemberCard
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
              <Link href={`/content/${community.slug}`} className="text-xs text-muted-foreground hover:text-foreground">
                {community.name} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
