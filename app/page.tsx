import Image from "next/image";
import { HeroBackground } from "@/components/HeroBackground";
import { TypingText } from "@/components/TypingText";

export default function Home() {
  return (
    <main className="bg-background">
      <section className="px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="dark-panel relative isolate overflow-hidden rounded-2xl border border-white/10 bg-black px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24">
            <HeroBackground />
            <div className="relative z-10 mx-auto max-w-3xl text-center">
              <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Every moment happens on Avalanche.
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                Claim on-chain proof of the events you showed up for — recognized by AcreLabs.
              </p>

            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <span className="brand-kicker text-muted-foreground/70">Built for</span>
          <Image src="/trustby/Team1.png" alt="Team1" width={2054} height={578} className="h-5 w-auto opacity-60 brightness-0 invert sm:h-6" />
          <Image src="/trustby/AvalancheLogo.png" alt="Avalanche" width={1835} height={271} className="h-4 w-auto opacity-60 brightness-0 invert sm:h-5" />
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1400px]">
          <TypingText
            text="Acre Labs is a growing library of projects that collect, recognize, and preserve the moments that matter across Avalanche."
            className="mx-auto max-w-4xl text-center text-2xl font-semibold leading-snug tracking-tight text-muted-foreground sm:text-3xl lg:text-4xl"
          />
        </div>
      </section>
    </main>
  );
}
