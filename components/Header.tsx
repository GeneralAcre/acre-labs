"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { WalletButton } from "./WalletButton";

const NAV_LINKS = [
  { href: "/claim", label: "Claim" },
  { href: "/collection", label: "Collection" },
  { href: "/profile", label: "Profile" },
  { href: "/create", label: "Create Drop" },
];

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 5H15.5M2.5 9H15.5M2.5 13H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="relative z-50 w-full border-b border-brand-mist/10 bg-brand-surface text-brand-mist">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/project-logo/AcreLabs.png"
            alt="AcreLabs"
            width={43}
            height={79}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-[0.2em]">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-opacity hover:opacity-60">
                {link.label}
              </Link>
            ))}
          </nav>
          <WalletButton tone="light" showSwitchLink />
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-mist/15 text-brand-mist sm:hidden"
        >
          <MenuIcon />
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-brand-surface text-brand-mist sm:hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex shrink-0 items-center"
            >
              <Image
                src="/project-logo/AcreLabs.png"
                alt="AcreLabs"
                width={43}
                height={79}
                className="h-8 w-auto"
              />
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="pill-outline-light h-10 px-5 text-sm font-medium"
            >
              Close
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="w-full border-b border-brand-mist/10 py-5 text-center text-2xl font-medium uppercase tracking-wide transition-opacity first:border-t hover:opacity-60"
              >
                {link.label}
              </Link>
            ))}
            <WalletButton
              tone="light"
              className="mt-8 w-full max-w-xs"
              size="lg"
              showSwitchLink
            />
          </nav>

          <div className="select-none overflow-hidden py-2">
            <span
              aria-hidden="true"
              className="-mx-6 block whitespace-nowrap font-heading text-[22vw] uppercase leading-none text-brand-mist/10"
            >
              AcreLabs
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
