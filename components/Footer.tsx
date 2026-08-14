import Link from "next/link";
import { ACTIVE_CHAIN } from "@/lib/web3/chains";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-brand-mist/10 bg-brand-ink text-brand-mist">
      <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-8">
          <div>
            <Link href="/" className="font-heading text-4xl uppercase leading-none tracking-tight transition-opacity hover:opacity-70">
              AcreLabs
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-brand-mist/60">
              A growing library of projects for collecting, recognizing, and preserving the moments that matter on Avalanche.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.16em] text-brand-mist/40">Built on Avalanche</p>
          </div>

          <FooterLinks
            title="Projects"
            links={[
              { href: "/badge", label: "Badge" },
              { href: "/badge", label: "Explore badges" },
            ]}
          />
          <FooterLinks
            title="Platform"
            links={[
              { href: "/claim", label: "Claim" },
              { href: "/collection", label: "Collection" },
              { href: "/create", label: "Create" },
              { href: "/profile", label: "Profile" },
            ]}
          />
          <div className="flex flex-col gap-3">
            <span className="brand-kicker text-brand-mist/40">Info</span>
            <Link href="/terms" className="text-sm text-brand-mist/70 transition-colors hover:text-brand-mist">Terms of use</Link>
            <Link href="/privacy" className="text-sm text-brand-mist/70 transition-colors hover:text-brand-mist">Privacy policy</Link>
            <a href="https://www.avax.network/" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-mist/70 transition-colors hover:text-brand-mist">Avalanche</a>
            <a href={ACTIVE_CHAIN.explorerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-mist/70 transition-colors hover:text-brand-mist">SnowTrace</a>
          </div>
        </div>
      </div>

      <div className="border-t border-brand-mist/10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-5 text-xs text-brand-mist/50 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span>© {year} AcreLabs. All rights reserved.</span>
          <span>Every moment happens on Avalanche.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="brand-kicker text-brand-mist/40">{title}</span>
      {links.map((link) => (
        <Link key={link.label} href={link.href} className="text-sm text-brand-mist/70 transition-colors hover:text-brand-mist">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
