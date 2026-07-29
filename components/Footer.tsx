import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-brand-mist/10 bg-brand-ink text-brand-mist">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-6 py-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <span className="font-heading text-lg uppercase tracking-wide">AcreLabs</span>
          <p className="max-w-xs text-sm text-brand-mist/70">
            On-chain proof of attendance for events, minted on Avalanche.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="brand-kicker text-brand-mist/60">Product</span>
          <Link href="/claim" className="text-sm text-brand-mist/80 hover:text-brand-mist">
            Claim a Drop
          </Link>
          <Link
            href="/collection"
            className="text-sm text-brand-mist/80 hover:text-brand-mist"
          >
            My Collection
          </Link>
          <Link href="/explore" className="text-sm text-brand-mist/80 hover:text-brand-mist">
            Explore
          </Link>
          <Link href="/create" className="text-sm text-brand-mist/80 hover:text-brand-mist">
            Create Drop
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="brand-kicker text-brand-mist/60">Legal</span>
          <Link href="/terms" className="text-sm text-brand-mist/80 hover:text-brand-mist">
            Terms of Use
          </Link>
          <Link href="/privacy" className="text-sm text-brand-mist/80 hover:text-brand-mist">
            Privacy Policy
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <span className="brand-kicker text-brand-mist/60">Network</span>
          <a
            href="https://www.avax.network/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-mist/80 hover:text-brand-mist"
          >
            Avalanche
          </a>
          <a
            href="https://testnet.snowtrace.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-mist/80 hover:text-brand-mist"
          >
            SnowTrace
          </a>
        </div>
      </div>

      <div className="border-t border-brand-mist/10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-6 py-6 text-xs text-brand-mist/60 sm:flex-row sm:justify-between">
          <span>© {year} AcreLabs. All rights reserved.</span>
          <span>Built on Avalanche.</span>
        </div>
      </div>
    </footer>
  );
}
