import Image from "next/image";
import Link from "next/link";
import { ACTIVE_CHAIN } from "@/lib/web3/chains";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/project-logo/AcreLabs.png"
                alt=""
                width={43}
                height={79}
                className="h-7 w-auto brightness-0 invert"
              />
              <span className="text-lg font-bold tracking-tight text-foreground">AcreLabs</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A growing library of projects for collecting, recognizing, and preserving the moments that matter on Avalanche.
            </p>
          </div>

          <FooterLinks
            title="Projects"
            links={[
              { href: "/badge", label: "Badge" },
              { href: "/content", label: "Content" },
            ]}
          />
          <FooterLinks
            title="Platform"
            links={[
              { href: "/badge?tab=create", label: "Create Badge" },
              { href: "/profile", label: "Profile" },
            ]}
          />
          <FooterLinks
            title="Resources"
            links={[
              { href: "https://www.avax.network/", label: "Avalanche", external: true },
              { href: ACTIVE_CHAIN.explorerUrl, label: "SnowTrace", external: true },
            ]}
          />
        </div>

        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {year} AcreLabs. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E84142]" aria-hidden="true" />
              Built on Avalanche
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
