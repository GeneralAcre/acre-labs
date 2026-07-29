import type { Metadata } from "next";
import { Geist, Geist_Mono, Iceberg } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { WalletButton } from "@/components/WalletButton";
import { WalletProvider } from "@/components/WalletProvider";
import { PrivyClientProvider } from "@/components/PrivyClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const iceberg = Iceberg({
  weight: "400",
  variable: "--font-iceberg",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AcreLabs",
  description: "AcreLabs — claim your on-chain proof of attendance on Avalanche.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${iceberg.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <PrivyClientProvider>
          <WalletProvider>
            <header className="w-full border-b border-brand-mist/10 bg-brand-surface text-brand-mist">
              <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
                <Link href="/" className="font-heading text-lg uppercase tracking-wide">
                  AcreLabs
                </Link>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
                  <nav className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium uppercase tracking-[0.2em]">
                    <Link href="/claim" className="transition-opacity hover:opacity-60">
                      Claim
                    </Link>
                    <Link href="/collection" className="transition-opacity hover:opacity-60">
                      Collection
                    </Link>
                    <Link href="/explore" className="transition-opacity hover:opacity-60">
                      Explore
                    </Link>
                    <Link href="/create" className="transition-opacity hover:opacity-60">
                      Create Drop
                    </Link>
                  </nav>
                  <WalletButton tone="light" />
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </WalletProvider>
        </PrivyClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
