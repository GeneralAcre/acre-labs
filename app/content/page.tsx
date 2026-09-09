"use client";

import Link from "next/link";
import { PassportCard } from "@/components/PassportCard";

// A static, non-claimable sample — purely to show what a minted pass looks
// like on this landing page. Points its QR back at this same page rather
// than a real (nonexistent) claim, so scanning the preview doesn't 404.
const SAMPLE_PASSPORT = {
  title: "Your Hackathon",
  location: "Worldwide · Online",
  eventEndTime: Date.now() + 1000 * 60 * 60 * 24 * 30,
  holderAddress: "0x000000000000000000000000000000000c0ffee",
  verifyPath: "/content",
};

export default function ContentPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-brand-mist/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_35%,rgba(216,8,25,0.36),transparent_25rem)]" />
        <div className="relative mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="flex flex-col items-start">
            <span className="brand-kicker text-brand-mist/60">02 / Project</span>
            <h1 className="mt-5 font-heading text-7xl uppercase leading-[0.8] tracking-[-0.055em] text-brand-mist sm:text-8xl">
              Content
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-brand-mist/75 sm:text-lg">
              Mint your passport — an on-chain ticket that gets you into the hackathon and
              proves you were there. No forms, no middlemen: connect a wallet, enter the
              organizer&apos;s code, and it&apos;s yours to keep.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/content/claim" className="pill-light h-12 px-7 text-sm font-medium">
                Browse hackathons
              </Link>
              <Link
                href="/content/create"
                className="pill-outline-light h-12 px-7 text-sm font-medium"
              >
                Host a hackathon
              </Link>
            </div>
          </div>

          <PassportCard
            title={SAMPLE_PASSPORT.title}
            location={SAMPLE_PASSPORT.location}
            eventEndTime={SAMPLE_PASSPORT.eventEndTime}
            holderAddress={SAMPLE_PASSPORT.holderAddress}
            verifyPath={SAMPLE_PASSPORT.verifyPath}
            className="lg:max-w-none"
          />
        </div>
      </section>
    </div>
  );
}
