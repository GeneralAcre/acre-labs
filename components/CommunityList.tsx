"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CommunityRecord } from "@/lib/types";
import { MemberCard } from "@/components/MemberCard";

export function CommunityList() {
  const [communities, setCommunities] = useState<CommunityRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/communities");
      const data = await res.json().catch(() => ({ communities: [] }));
      if (!cancelled) setCommunities(data.communities ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
      {communities && communities.length > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">Choose an event to make your ID card.</p>
      )}
      {communities === null && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {communities?.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No communities yet — create the first one.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {communities?.map((community) => (
          <Link
            key={community.id}
            href={`/content/${community.slug}`}
            className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
          >
            {/* The event's card template, so people see what they'll get. */}
            <div className="pointer-events-none transition-transform duration-300 group-hover:-translate-y-0.5">
              <MemberCard
                preview
                id={`template-${community.id}`}
                memberNo={1}
                communityName={community.name}
                cardColor={community.cardColor}
                accentColor={community.accentColor}
                issuedAt={community.issueDate}
                name="Your name"
                xHandle="yourhandle"
                avatarUrl={null}
                joinedAt={community.createdAt}
              />
            </div>
            <div className="flex items-center gap-3">
              {community.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data: URI / local logo
                <img src={community.imageUrl} alt="" className="size-12 shrink-0 rounded-xl border border-border bg-black/40 object-contain p-1" />
              ) : (
                <div className="badge-gradient flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white">
                  {community.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{community.name}</h2>
                <p className="truncate text-xs text-muted-foreground">Created by {community.creatorName}</p>
              </div>
            </div>
            {community.description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{community.description}</p>
            )}
            <div className="mt-auto flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 font-medium text-foreground">
                {community.memberCount} member{community.memberCount === 1 ? "" : "s"}
              </span>
              <span className="font-semibold text-foreground transition-transform group-hover:translate-x-0.5">Get your card →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
