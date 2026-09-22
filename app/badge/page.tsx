import Link from "next/link";

export default function BadgePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-brand-mist/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col items-start">
            <span className="brand-kicker text-brand-mist/50">Acre Labs</span>
            <h1 className="mt-4 font-heading text-7xl uppercase leading-[0.8] tracking-[-0.03em] text-brand-mist sm:text-8xl">
              Badge
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-brand-mist/75 sm:text-lg">
              Collect the moments you were part of. Badge turns attendance, community, and shared experiences into something you can keep.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/claim" className="pill-light h-12 px-7 text-sm font-medium">
                Explore badges
              </Link>
              <Link href="/create" className="pill-outline-light h-12 px-7 text-sm font-medium">
                Create a badge
              </Link>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-sm border border-brand-mist/15 bg-brand-surface">
            <div className="absolute left-8 top-8 border border-brand-mist/30 px-3 py-1 font-mono text-[0.65rem] tracking-[0.2em] text-brand-mist/70">
              BADGE
            </div>
            <span className="absolute bottom-7 left-8 font-heading text-6xl uppercase leading-none tracking-[-0.03em] text-brand-mist">
              B
            </span>
            <div className="absolute bottom-8 right-8 grid grid-cols-4 gap-1.5">
              {Array.from({ length: 16 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${index % 3 === 0 ? "bg-brand-mist" : "bg-brand-mist/20"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
