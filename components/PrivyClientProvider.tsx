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
