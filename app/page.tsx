import Image from "next/image";
import Link from "next/link";
import { HeroBackground } from "@/components/HeroBackground";

const steps = [
  { index: "01", title: "Create", copy: "Set a code and a picture." },
  { index: "02", title: "Claim", copy: "Attendees enter the code." },
  { index: "03", title: "Collect", copy: "NFT lands in their wallet." },
];

const audiences = ["Organizers", "Attendees", "Communities & DAOs"];

const stats = [
  { value: "6-digit", label: "Claim code" },
  { value: "24 hr", label: "Window after the event ends" },
  { value: "1 / wallet", label: "No duplicate claims" },
];

export default function Home() {
  return (
    <>
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
        <HeroBackground />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="mt-4 max-w-4xl font-heading text-6xl uppercase leading-[0.88] tracking-tight text-brand-mist sm:text-8xl">
            Acre Labs
          </h1>

          <p className="mt-4 font-serif text-lg italic text-brand-mist/90">
            Finalized on Avalanche in seconds.
          </p>

          <div className="mt-8 flex w-full flex-row gap-3 sm:w-auto">
            <Link
              href="/claim"
              className="pill-dark h-11 flex-1 px-4 text-xs font-medium sm:h-12 sm:flex-none sm:px-8 sm:text-sm"
            >
              Claim a Drop
            </Link>
            <Link
              href="/profile"
              className="pill-light h-11 flex-1 px-4 text-xs font-medium sm:h-12 sm:flex-none sm:px-8 sm:text-sm"
            >
              My Collection
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-brand-mist/10 bg-background px-6 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-mist/40">
            Built for
          </span>
          <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16">
            <Image
              src="/trustby/Team1.png"
              alt="Team1"
              width={2054}
              height={578}
              className="h-7 w-auto opacity-80 sm:h-8"
            />
            <Image
              src="/trustby/AvalancheLogo.png"
              alt="Avalanche"
              width={1835}
              height={271}
              className="h-6 w-auto opacity-80 sm:h-7"
            />
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-brand-mist/10 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.index}
                className="group relative flex flex-col justify-between gap-6 overflow-hidden bg-background p-6 sm:min-h-44"
              >
                <span className="pointer-events-none absolute -bottom-6 -right-2 font-heading text-[7rem] leading-none text-brand-mist/5 transition-colors group-hover:text-brand-red/10 sm:text-[8rem]">
                  {step.index}
                </span>
                <span className="relative font-mono text-xs text-brand-mist/40">{step.index}</span>
                <div className="relative">
                  <h3 className="font-heading text-2xl uppercase tracking-tight text-brand-mist">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-brand-mist/60">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-red px-6 py-14 text-brand-mist sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <h2 className="max-w-lg font-heading text-4xl uppercase leading-[0.95] tracking-tight sm:text-5xl">
            No forms.
            <br />
            No middlemen.
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="border-t border-brand-mist/30 pt-4">
                <span className="font-heading text-4xl uppercase tracking-tight sm:text-5xl">
                  {stat.value}
                </span>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-mist/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-14 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-3xl uppercase tracking-tight text-brand-mist sm:text-4xl">
              Anyone Proving
              <br />
              They Showed Up
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {audiences.map((audience) => (
              <span
                key={audience}
                className="pill-outline-light h-11 px-5 text-sm font-medium text-brand-mist/80"
              >
                {audience}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
