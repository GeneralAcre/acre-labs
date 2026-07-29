"use client";

import { useWallet } from "./WalletProvider";
import { isCoreProvider } from "@/lib/web3/providers";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Core's brand mark (red field, white triangle) so it reads as a real wallet
// option in the picker even when the extension isn't installed yet and there's
// no EIP-6963 icon to show.
function CoreWalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="rounded" aria-hidden="true">
      <rect width="20" height="20" rx="4" fill="#E84142" />
      <path d="M10 4.5 L15.5 15 H4.5 Z" fill="white" />
    </svg>
  );
}

const SIZE_CLASSES = {
  sm: "h-9 px-4 text-xs",
  lg: "h-12 px-8 text-sm",
} as const;

// "dark" reads correctly on light backgrounds; "light" is for placement on
// dark surfaces — the navbar and the red/gradient hero sections alike.
const CONNECTED_TONE_CLASSES = {
  dark: "pill-outline-dark",
  light: "pill-outline-light",
} as const;

const SWITCH_LINK_TONE_CLASSES = {
  dark: "text-brand-ink/50 hover:text-brand-ink",
  light: "text-brand-mist/70 hover:text-brand-mist",
} as const;

export function WalletButton({
  className = "",
  size = "sm",
  tone = "dark",
  connectLabel = "Connect Wallet",
  showSwitchLink = false,
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
  tone?: keyof typeof CONNECTED_TONE_CLASSES;
  connectLabel?: string;
  showSwitchLink?: boolean;
}) {
  const {
    address,
    providerName,
    connecting,
    error,
    availableWallets,
    isChooserOpen,
    beginConnect,
    openChooser,
    chooseWallet,
    connectWithEmail,
    closeChooser,
    disconnect,
  } = useWallet();

  const sizeClass = SIZE_CLASSES[size];
  const connectedToneClass = CONNECTED_TONE_CLASSES[tone];
  const coreDetail = availableWallets.find(isCoreProvider) ?? null;
  const otherWallets = availableWallets.filter((detail) => !isCoreProvider(detail));

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      {address ? (
        <button
          onClick={disconnect}
          title={
            providerName
              ? `Connected with ${providerName}. Click to disconnect.`
              : "Click to disconnect"
          }
          className={`${connectedToneClass} font-mono font-medium ${sizeClass}`}
        >
          {shortenAddress(address)}
        </button>
      ) : (
        <>
          <button
            onClick={beginConnect}
            disabled={connecting}
            className={`pill-dark font-medium disabled:opacity-50 ${sizeClass}`}
          >
            {connecting ? "Connecting…" : connectLabel}
          </button>
          {showSwitchLink && !connecting && (
            <button
              onClick={openChooser}
              className={`text-[11px] underline-offset-2 hover:underline ${SWITCH_LINK_TONE_CLASSES[tone]}`}
            >
              Use a different wallet
            </button>
          )}
        </>
      )}

      {isChooserOpen && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-brand-mist/10 bg-brand-surface p-2 text-left shadow-lg">
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-brand-mist/50">
            Choose a wallet
          </p>
          {/* Always listed first, with its own icon, whether or not the
              extension is installed — it's Avalanche's native wallet and the
              app's preferred connector. Installed: connects like any other
              option below. Not installed: opens the install page instead. */}
          {coreDetail ? (
            <button
              onClick={() => chooseWallet(coreDetail)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-mist hover:bg-brand-ink"
            >
              <CoreWalletIcon />
              Core Wallet
            </button>
          ) : (
            <a
              href="https://core.app/tools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-mist hover:bg-brand-ink"
            >
              <CoreWalletIcon />
              Core Wallet
              <span className="ml-auto text-[10px] text-brand-mist/40">Install</span>
            </a>
          )}
          {otherWallets.map((detail) => (
            <button
              key={detail.info.uuid}
              onClick={() => chooseWallet(detail)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-mist hover:bg-brand-ink"
            >
              {/* EIP-6963 icons are data URIs, not external requests */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.info.icon} alt="" width={20} height={20} className="rounded" />
              {detail.info.name}
            </button>
          ))}
          <button
            onClick={connectWithEmail}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-brand-mist hover:bg-brand-ink"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-mist/10 text-xs">
              ✉
            </span>
            Continue with Email
          </button>
          <p className="px-2 pt-1 text-[10px] text-brand-mist/40">
            No wallet? We&apos;ll create one for you.
          </p>
          <button
            onClick={closeChooser}
            className="mt-1 w-full rounded-lg px-2 py-2 text-left text-xs text-brand-mist/50 hover:bg-brand-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {error && !isChooserOpen && (
        <p className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-brand-red/20 bg-brand-surface p-2 text-xs text-brand-red shadow-lg">
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
