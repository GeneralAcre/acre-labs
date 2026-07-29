import { ACTIVE_CHAIN } from "@/lib/web3/chains";

// Requires signing up at https://dashboard.privy.io, creating an app, and
// setting NEXT_PUBLIC_PRIVY_APP_ID — without it, email/social sign-in stays
// disabled but the rest of the app (Core/MetaMask connect) works normally.
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
export const isPrivyConfigured = PRIVY_APP_ID.length > 0;

// Privy's SDK hard-validates that appId is exactly 25 characters, even before
// any network call is made — an obviously-fake placeholder of the right shape
// keeps <PrivyProvider> from throwing during render when unconfigured. We
// never actually call privy.login() unless isPrivyConfigured is true, so this
// placeholder is never used to attempt a real sign-in.
export const PRIVY_PROVIDER_APP_ID = isPrivyConfigured ? PRIVY_APP_ID : "0".repeat(25);

// Privy expects a viem-shaped chain object rather than our internal ChainConfig.
export const PRIVY_CHAIN = {
  id: ACTIVE_CHAIN.id,
  name: ACTIVE_CHAIN.name,
  nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
  rpcUrls: {
    default: { http: [ACTIVE_CHAIN.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "SnowTrace", url: ACTIVE_CHAIN.explorerUrl },
  },
} as const;
