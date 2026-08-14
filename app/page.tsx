import Link from "next/link";
import { HeroBackground } from "@/components/HeroBackground";

const features = [
  {
    number: "01",
    title: "Badge",
    copy: "Give people a simple on-chain badge for showing up. Create it, share a code, and let attendees claim it.",
    href: "/create",
    action: "Create a badge",
  },
  {
    number: "02",
    title: "Collection",
    copy: "Bring the things your community earns together in one personal, shareable collection.",
    href: "/collection",
    action: "View collection",
  },
  { 
    number: "03",
    title: "More to come",
    copy: "Acre Labs is building more ways for communities to recognize, reward, and connect with their people.",
    href: "/profile",
    action: "Explore your profile",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative flex min-h-[68vh] items-center overflow-hidden px-6 py-20 sm:px-10">
        <HeroBackground />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-start">
          <h1 className="mt-5 font-heading text-6xl leading-[0.86] tracking-tight text-brand-mist sm:text-8xl lg:text-9xl">
            AcreLabs
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-mist/80 sm:text-lg">
            Everything happens on Avalanche, Recognized by us
          </p>

          <div className="mt-14 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row">
            <Link
              href="/create"
              className="pill-light h-12 px-7 text-sm font-medium"
            >
              Get started
            </Link>
            <Link
              href="/collection"
              className="pill-outline-light h-12 px-7 text-sm font-medium"
            >
              Explore collection
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-xl">
            <h2 className="mt-3 font-heading text-4xl uppercase leading-[0.95] tracking-tight text-brand-mist sm:text-5xl">
              One home for community moments
            </h2>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-brand-mist/10 sm:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="flex min-h-72 flex-col bg-brand-surface p-6">
                <span className="font-mono text-xs text-brand-mist/40">{feature.number}</span>
                <h3 className="mt-10 font-heading text-3xl uppercase tracking-tight text-brand-mist">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-brand-mist/60">{feature.copy}</p>
                <Link
                  href={feature.href}
                  className="mt-auto pt-8 text-xs font-medium uppercase tracking-[0.16em] text-brand-mist transition-opacity hover:opacity-60"
                >
                  {feature.action} <span aria-hidden="true"></span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
