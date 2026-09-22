"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { PRIVY_CHAIN, PRIVY_PROVIDER_APP_ID } from "@/lib/privy/config";

// Email/social sign-in only here — external wallets (Core, MetaMask) are
// handled separately by our own EIP-6963 picker in WalletProvider, so there's
// no need for Privy's own "connect wallet" option and the resulting overlap.
export function PrivyClientProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_PROVIDER_APP_ID}
      config={{
        loginMethods: ["email"],
        appearance: {
          theme: "dark",
          accentColor: "#d80819",
          // Empty on purpose: external wallets (Core, MetaMask) are handled by
          // our own EIP-6963 picker above, not Privy.
          walletList: [],
        },
        // `appearance.walletList` above only reorders the login-modal buttons —
        // it does NOT stop Privy from scanning window.ethereum and wrapping
        // whatever it finds as an internal connector on mount. When another
        // extension is mid-injecting or isn't a fully-conformant EIP-1193
        // provider, that wrap throws "this.walletProvider?.on is not a
        // function" inside Privy's SDK. This flag is what actually skips that
        // scan (we don't use Privy for external wallets at all).
        externalWallets: {
          disableAllExternalWallets: true,
        },
        defaultChain: PRIVY_CHAIN,
        supportedChains: [PRIVY_CHAIN],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
