import type { Metadata } from "next";
import { Geist, Geist_Mono, Iceberg, Arimo, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
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

const arimo = Arimo({
  weight: "700",
  variable: "--font-arimo",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${iceberg.variable} ${arimo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <PrivyClientProvider>
          <WalletProvider>
            <Header />
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </WalletProvider>
        </PrivyClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
