"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Trophy, UserRound, Users, type LucideIcon } from "lucide-react";
import { WalletButton } from "./WalletButton";

// Badge holds the wallet-based claim gallery (and Create Badge tab);
// Content is the name+X check-in session.
const NAV_LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/badge", label: "Badge", Icon: BadgeCheck },
  { href: "/content", label: "Content", Icon: Users },
  { href: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export function Header() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className="sticky top-0 z-40">
        <header className="flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/project-logo/AcreLabs.png"
              alt=""
              width={43}
              height={79}
              priority
              className="h-7 w-auto brightness-0 invert"
            />
            <span className="text-base font-bold tracking-tight text-foreground">AcreLabs</span>
          </Link>

          <nav className="ml-8 hidden items-center gap-2 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${
                  isActive(link.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <WalletButton tone="light" size="lg" />
          </div>
        </header>
      </div>

      {/* Mobile: app-style bottom tab bar instead of a hamburger menu. The
          root layout pads the page bottom on small screens so this never
          covers the footer. */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        <div className="grid h-16 grid-cols-4">
          {NAV_LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
