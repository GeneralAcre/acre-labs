import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WalletProvider } from "@/components/WalletProvider";
import { PrivyClientProvider } from "@/components/PrivyClientProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AcreLabs",
  description: "AcreLabs — claim your on-chain proof of attendance on Avalanche.",
};

// "cover" lets env(safe-area-inset-bottom) report the iPhone home-indicator
// inset, which the mobile bottom tab bar pads itself by.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      {/* Bottom padding on mobile reserves room for Header's fixed tab bar. */}
      <body className="flex min-h-full flex-col bg-background pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <PrivyClientProvider>
          <WalletProvider>
            <TooltipProvider>
              <Header />
              <div className="flex flex-1 flex-col">{children}</div>
              <Footer />
            </TooltipProvider>
          </WalletProvider>
        </PrivyClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
