import Link from "next/link";

const steps = [
  { index: "01", title: "Create", copy: "Set a code and a picture." },
  { index: "02", title: "Claim", copy: "Attendees enter the code." },
  { index: "03", title: "Collect", copy: "NFT lands in their wallet." },
];

const audiences = ["Organizers", "Attendees", "Communities & DAOs"];

const stats = [
  { value: "6-digit", label: "Claim code" },
  { value: "2 hr", label: "Window after the event ends" },
  { value: "1 / wallet", label: "No duplicate claims" },
];

export default function Home() {
  return (
    <>
      <section className="brand-gradient relative flex flex-col items-center overflow-hidden px-6 pt-28 pb-24 text-center">
        <span className="brand-kicker text-brand-mist/80">[ 01 ] Avalanche · Proof of Attendance</span>

        <h1 className="mt-6 max-w-4xl font-heading text-6xl uppercase leading-[0.88] tracking-tight text-brand-mist sm:text-8xl">
          Claim Your
          <br />
          Event NFT
        </h1>

        <p className="mt-6 font-serif text-lg italic text-brand-mist/90">
          Finalized on Avalanche in seconds.
        </p>

        <div className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Link href="/claim" className="pill-dark h-12 w-full px-8 text-sm font-medium sm:w-auto">
            Claim a Drop
          </Link>
          <Link
            href="/collection"
            className="pill-light h-12 w-full px-8 text-sm font-medium sm:w-auto"
          >
            My Collection
          </Link>
        </div>
      </section>

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          <span className="brand-kicker text-brand-red">[ 02 ] How It Works</span>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-brand-mist/10 sm:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.index}
                className="group relative flex flex-col justify-between gap-10 overflow-hidden bg-background p-8 sm:min-h-56"
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

      <section className="bg-brand-red px-6 py-20 text-brand-mist sm:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
          <h2 className="max-w-lg font-heading text-4xl uppercase leading-[0.95] tracking-tight sm:text-5xl">
            No forms.
            <br />
            No middlemen.
          </h2>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
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

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <span className="brand-kicker text-brand-red">[ 03 ] Built For</span>
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
