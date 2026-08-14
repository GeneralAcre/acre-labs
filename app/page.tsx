import Image from "next/image";
import { HeroBackground } from "@/components/HeroBackground";
import { ProjectsCarousel } from "@/components/ProjectsCarousel";
import { TypingText } from "@/components/TypingText";

export default function Home() {
  return (
    <>
      <section className="relative flex min-h-[68vh] items-center overflow-hidden px-6 py-20 sm:px-10">
        <HeroBackground />
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <h1 className="mt-5 font-heading text-6xl leading-[0.86] tracking-tight text-brand-mist sm:text-8xl lg:text-9xl">AcreLabs</h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-mist/80 sm:text-lg">Every moment happens on Avalanche, Recognized by us</p>
        </div>
      </section>

      <section className="border-b border-brand-mist/10 bg-background px-6 py-9 sm:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center">
          <span className="brand-kicker text-brand-mist/40">Built for</span>
          <div className="flex items-center justify-center gap-8 sm:gap-12">
            <Image src="/trustby/Team1.png" alt="Team1" width={2054} height={578} className="h-6 w-auto opacity-75 sm:h-7" />
            <Image src="/trustby/AvalancheLogo.png" alt="Avalanche" width={1835} height={271} className="h-5 w-auto opacity-75 sm:h-6" />
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <TypingText
            text="Acre Labs is a growing library of projects that collect, recognize, and preserve the moments that matter across Avalanche."
            className="max-w-3xl text-2xl font-semibold leading-[0.95] tracking-tight text-brand-mist/80 sm:text-4xl"
          />
          <div className="mt-16 max-w-xl sm:mt-20">
            <h2 className="mt-3 font-heading text-4xl uppercase leading-[0.95] tracking-tight text-brand-mist sm:text-5xl">A library for Avalanche moments</h2>
          </div>
          <ProjectsCarousel />
        </div>
      </section>
    </>
  );
}
