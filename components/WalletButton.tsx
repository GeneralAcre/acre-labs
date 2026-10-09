"use client";

import { useState } from "react";
import { useWallet } from "./WalletProvider";
import { isCoreProvider } from "@/lib/web3/providers";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Core's brand mark (red field, white triangle) so it reads as a real wallet
// option in the picker even when the extension isn't installed yet and there's
// no EIP-6963 icon to show.
// MetaMask's orange fox-tone mark, used when the extension isn't detected.
function MetaMaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="rounded" aria-hidden="true">
      <rect width="20" height="20" rx="4" fill="#F6851B" />
      <path d="M5 5.5 L10 9 L15 5.5 L14 12.5 L10 15 L6 12.5 Z" fill="white" />
    </svg>
  );
}

const METAMASK_RDNS = "io.metamask";

// Opens this page inside the MetaMask mobile app's browser on phones, or
// MetaMask's download page on desktop — the official deep-link format.
function metaMaskDeepLink(): string {
  if (typeof window === "undefined") return "https://metamask.io/download/";
  return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}${window.location.search}`;
}

function CoreWalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="rounded" aria-hidden="true">
      <rect width="20" height="20" rx="4" fill="#E84142" />
      <path d="M10 4.5 L15.5 15 H4.5 Z" fill="white" />
    </svg>
  );
}

const SIZE_CLASSES = {
  sm: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
} as const;

// "dark" reads correctly on light backgrounds; "light" is for placement on
// dark surfaces — the navbar and the red/gradient hero sections alike.
const CONNECTED_TONE_CLASSES = {
  dark: "pill-outline-dark",
  light: "pill-outline-light",
} as const;

export function WalletButton({
  className = "",
  size = "sm",
  tone = "dark",
  connectLabel = "Connect Wallet",
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof CONNECTED_TONE_CLASSES;
  connectLabel?: string;
}) {
  const {
    address,
    providerName,
    connecting,
    error,
    availableWallets,
    isChooserOpen,
    beginConnect,
    switchWallet,
    chooseWallet,
    connectWithEmail,
    closeChooser,
    disconnect,
  } = useWallet();

  const [isMenuOpen, setMenuOpen] = useState(false);

  const sizeClass = SIZE_CLASSES[size];
  const connectedToneClass = CONNECTED_TONE_CLASSES[tone];
  const coreDetail = availableWallets.find(isCoreProvider) ?? null;
  const metaMaskDetail = availableWallets.find((detail) => detail.info.rdns === METAMASK_RDNS) ?? null;
  const otherWallets = availableWallets.filter(
    (detail) => !isCoreProvider(detail) && detail.info.rdns !== METAMASK_RDNS
  );

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      {address ? (
        <button
          onClick={() => setMenuOpen((open) => !open)}
          title={providerName ? `Connected with ${providerName}` : undefined}
          className={`${connectedToneClass} font-mono font-medium ${sizeClass}`}
        >
          {shortenAddress(address)}
        </button>
      ) : (
        <>
          <button
            onClick={beginConnect}
            disabled={connecting}
            className={`pill-light disabled:opacity-50 ${sizeClass}`}
          >
            {connecting ? "Connecting…" : connectLabel}
          </button>
        </>
      )}

      {isMenuOpen && address && (
        <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-border bg-popover p-1.5 text-left shadow-2xl shadow-black/60">
          {providerName && (
            <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {providerName}
            </p>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              switchWallet();
            }}
            className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
          >
            Switch wallet
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
            className="flex w-full items-center rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
          >
            Disconnect
          </button>
        </div>
      )}

      {isChooserOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-popover p-1.5 text-left shadow-2xl shadow-black/60">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Choose a wallet
          </p>
          {/* Always listed first, with its own icon, whether or not the
              extension is installed — it's Avalanche's native wallet and the
              app's preferred connector. Installed: connects like any other
              option below. Not installed: opens the install page instead. */}
          {coreDetail ? (
            <button
              onClick={() => chooseWallet(coreDetail)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <CoreWalletIcon />
              Core Wallet
            </button>
          ) : (
            <a
              href="https://core.app/tools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <CoreWalletIcon />
              Core Wallet
              <span className="ml-auto text-[10px] text-muted-foreground/70">Install</span>
            </a>
          )}
          {/* MetaMask is always offered too: connects when installed,
              otherwise opens the MetaMask app (mobile) or install page. */}
          {metaMaskDetail ? (
            <button
              onClick={() => chooseWallet(metaMaskDetail)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- EIP-6963 data: URI icon */}
              <img src={metaMaskDetail.info.icon} alt="" width={20} height={20} className="rounded" />
              MetaMask
            </button>
          ) : (
            <a
              href={metaMaskDeepLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <MetaMaskIcon />
              MetaMask
              <span className="ml-auto text-[10px] text-muted-foreground/70">Open app</span>
            </a>
          )}
          {otherWallets.map((detail) => (
            <button
              key={detail.info.uuid}
              onClick={() => chooseWallet(detail)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
            >
              {/* EIP-6963 icons are data URIs, not external requests */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.info.icon} alt="" width={20} height={20} className="rounded" />
              {detail.info.name}
            </button>
          ))}
          <button
            onClick={connectWithEmail}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-xs">
              ✉
            </span>
            Continue with Email or Google
          </button>
          <p className="px-2 pt-1 text-[10px] text-muted-foreground/70">
            No wallet? We&apos;ll create one for you.
          </p>
          <button
            onClick={closeChooser}
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-xs text-muted-foreground hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      )}

      {error && !isChooserOpen && (
        <p className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-brand-red/30 bg-popover p-2 text-xs text-brand-red shadow-lg">
          {error}{" "}
          {!error.startsWith("Email sign-in") && (
            <a
              href="https://core.app/tools"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Install Core Wallet
            </a>
          )}
        </p>
      )}
    </div>
  );
}
