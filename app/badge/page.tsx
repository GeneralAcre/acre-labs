import Link from "next/link";

export default function BadgePage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-brand-mist/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_35%,rgba(216,8,25,0.36),transparent_25rem)]" />
        <div className="relative mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="flex flex-col items-start">
            <h1 className="mt-5 font-heading text-7xl uppercase leading-[0.8] tracking-[-0.055em] text-brand-mist sm:text-8xl">
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

          <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-sm">
            <div className="absolute inset-0 rounded-[2rem] border border-brand-mist/15 bg-brand-surface shadow-2xl shadow-black/40" />
            <div className="absolute inset-4 rounded-[1.5rem] border border-brand-mist/10 bg-[linear-gradient(145deg,#d80819_0%,#6d0711_48%,#151515_100%)]" />
            <div className="absolute left-8 top-8 rounded-full border border-brand-mist/30 px-3 py-1 font-mono text-[0.65rem] tracking-[0.2em] text-brand-mist/80">
              BADGE
            </div>
            <span className="absolute bottom-7 left-8 font-heading text-6xl uppercase leading-none tracking-[-0.07em] text-brand-mist">
              B
            </span>
            <div className="absolute bottom-8 right-8 grid grid-cols-4 gap-1.5">
              {Array.from({ length: 16 }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${index % 3 === 0 ? "bg-brand-mist" : "bg-brand-mist/25"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
