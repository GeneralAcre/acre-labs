import Link from "next/link";
import { ACTIVE_CHAIN } from "@/lib/web3/chains";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-brand-mist/10 bg-brand-ink text-brand-mist">
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-1">
          <span className="font-heading text-base uppercase tracking-wide">AcreLabs</span>
          <p className="max-w-xs text-xs text-brand-mist/60">
            On-chain proof of attendance for events, minted on Avalanche.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 sm:gap-x-8">
          <div className="flex flex-col gap-2">
            <span className="brand-kicker text-brand-mist/50">Product</span>
            <Link href="/claim" className="text-sm text-brand-mist/80 hover:text-brand-mist">
              Claim a Drop
            </Link>
            <Link href="/profile" className="text-sm text-brand-mist/80 hover:text-brand-mist">
              Profile
            </Link>
            <Link
              href="/collection"
              className="text-sm text-brand-mist/80 hover:text-brand-mist"
            >
              Collection
            </Link>
            <Link href="/create" className="text-sm text-brand-mist/80 hover:text-brand-mist">
              Create Drop
            </Link>
          </div>

          {/* Stacks as one column on mobile to keep the grid at 2 columns;
              sm:contents drops this wrapper's box so Legal/Network become
              their own grid columns once there's room for 3. */}
          <div className="flex flex-col gap-5 sm:contents">
            <div className="flex flex-col gap-2">
              <span className="brand-kicker text-brand-mist/50">Legal</span>
              <Link href="/terms" className="text-sm text-brand-mist/80 hover:text-brand-mist">
                Terms of Use
              </Link>
              <Link href="/privacy" className="text-sm text-brand-mist/80 hover:text-brand-mist">
                Privacy Policy
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <span className="brand-kicker text-brand-mist/50">Network</span>
              <a
                href="https://www.avax.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-mist/80 hover:text-brand-mist"
              >
                Avalanche
              </a>
              <a
                href={ACTIVE_CHAIN.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-mist/80 hover:text-brand-mist"
              >
                SnowTrace
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-mist/10">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 py-4 text-xs text-brand-mist/60 sm:flex-row sm:justify-between">
          <span>© {year} AcreLabs. All rights reserved.</span>
          <span>Built on Avalanche.</span>
        </div>
      </div>
    </footer>
  );
}
