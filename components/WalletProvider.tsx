"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getEmbeddedConnectedWallet,
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import {
  discoverProviders,
  type Eip1193Provider,
  type EIP6963ProviderDetail,
} from "@/lib/web3/providers";
import { connectWallet, Web3ClaimError } from "@/lib/web3/wallet";
import { isPrivyConfigured } from "@/lib/privy/config";

const STORAGE_KEY = "acrelabs.walletRdns";

interface WalletContextValue {
  address: string | null;
  provider: Eip1193Provider | null;
  providerName: string | null;
  connecting: boolean;
  error: string | null;
  availableWallets: EIP6963ProviderDetail[];
  isChooserOpen: boolean;
  beginConnect: () => Promise<void>;
  switchWallet: () => Promise<void>;
  chooseWallet: (detail: EIP6963ProviderDetail) => Promise<void>;
  connectWithEmail: () => void;
  closeChooser: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const privy = usePrivy();
  const { wallets: privyWallets, ready: privyWalletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const creatingEmbeddedWalletRef = useRef(false);

  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [isChooserOpen, setChooserOpen] = useState(false);
  const [isPrivySession, setIsPrivySession] = useState(false);
  const [switchingToEmail, setSwitchingToEmail] = useState(false);
  const wasPrivyModalOpenRef = useRef(false);

  const finishConnect = useCallback(async (detail: EIP6963ProviderDetail | null) => {
    setError(null);
    setConnecting(true);
    try {
      const walletAddress = await connectWallet(detail?.provider);
      setAddress(walletAddress);
      setProvider(detail?.provider ?? null);
      setProviderName(detail?.info.name ?? "Wallet");
      setIsPrivySession(false);
      if (detail && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, detail.info.rdns);
      }
      setChooserOpen(false);
    } catch (err) {
      setError(
        err instanceof Web3ClaimError ? err.message : "Failed to connect wallet."
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  // Always opens the picker rather than auto-connecting to Core / the sole
  // detected wallet — that shortcut used to skip straight past "Continue
  // with Email", so anyone with a single injected wallet installed never
  // saw email as an option at all. Used for both the first connect and for
  // switching an already-connected wallet.
  const openChooser = useCallback(async () => {
    if (connecting) return;
    setError(null);
    setConnecting(true);
    const found = await discoverProviders();
    setAvailableWallets(found);
    setConnecting(false);
    setChooserOpen(true);
  }, [connecting]);

  const beginConnect = openChooser;
  const switchWallet = openChooser;

  const chooseWallet = useCallback(
    async (detail: EIP6963ProviderDetail) => {
      await finishConnect(detail);
    },
    [finishConnect]
  );

  // Email/social sign-in via Privy — creates an embedded wallet automatically
  // for anyone without one, mainly meant as a fallback for attendees at a
  // claim page who don't already have Core or MetaMask installed.
  const connectWithEmail = useCallback(() => {
    setError(null);
    if (!isPrivyConfigured) {
      setError(
        "Email sign-in isn't configured yet. Add NEXT_PUBLIC_PRIVY_APP_ID to enable it."
      );
      return;
    }
    if (!privy.ready) {
      setError("Email sign-in is still loading. Please try again in a moment.");
      return;
    }
    if (privy.error) {
      setError(`Email sign-in is unavailable: ${privy.error.message}`);
      return;
    }
    setChooserOpen(false);
    setConnecting(true);
    // Lets the embedded-wallet effect below adopt the new session even when
    // switching away from an already-connected external wallet — its
    // `!address` guard would otherwise block it, since `address` is still
    // set to the wallet we're switching away from. The old address/provider
    // are left in place until adoption actually succeeds, so cancelling the
    // login modal leaves the previous wallet connected instead of dropping
    // the user to a disconnected state.
    setSwitchingToEmail(true);
    // Specified here as well as in the provider config so this action keeps
    // offering exactly email + Google if the global Privy config changes.
    privy.login({ loginMethods: ["email", "google"] });
  }, [privy]);

  const closeChooser = useCallback(() => setChooserOpen(false), []);

  const disconnect = useCallback(() => {
    // Best-effort: revoke the site's account permission so the wallet shows
    // the account-selection prompt again next time instead of silently
    // reconnecting to the same address. Not every wallet supports this
    // (EIP-2255), so a rejection/error here is expected and ignored.
    provider?.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    }).catch(() => {});

    setAddress(null);
    setProvider(null);
    setProviderName(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    if (isPrivySession) {
      setIsPrivySession(false);
      privy.logout();
    }
  }, [provider, isPrivySession, privy]);

  // Silent reconnect: if the user previously picked an injected wallet and
  // it's still authorized, restore the session without prompting a popup.
  useEffect(() => {
    let cancelled = false;

    async function tryRestore() {
      if (typeof window === "undefined") return;
      const savedRdns = localStorage.getItem(STORAGE_KEY);
      if (!savedRdns) return;

      const found = await discoverProviders();
      if (cancelled) return;
      setAvailableWallets(found);

      const match = found.find((detail) => detail.info.rdns === savedRdns);
      if (!match) return;

      try {
        const accounts = (await match.provider.request({
          method: "eth_accounts",
        })) as string[];
        if (!cancelled && accounts[0]) {
          setAddress(accounts[0]);
          setProvider(match.provider);
          setProviderName(match.info.name);
        }
      } catch {
        // Ignore — user just reconnects manually if this fails.
      }
    }

    tryRestore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Adopts the Privy embedded wallet once login (new or restored from a
  // previous visit) completes — but never overrides an already-connected
  // injected wallet session.
  useEffect(() => {
    if ((address && !switchingToEmail) || !privy.ready || !privy.authenticated) return;

    const embedded = getEmbeddedConnectedWallet(privyWallets);
    if (!embedded) {
      // The Privy dashboard's "create on login" setting can override
      // createOnLogin in PrivyClientProvider. If a signed-in email user ends up
      // with no embedded wallet, create one here instead of leaving the
      // button stuck on "Connecting…". Skipped when the account already has
      // one that just hasn't finished connecting (createWallet would throw).
      const hasEmbedded = privy.user?.linkedAccounts.some(
        (account) => account.type === "wallet" && account.walletClientType === "privy"
      );
      if (privyWalletsReady && !hasEmbedded && !creatingEmbeddedWalletRef.current) {
        creatingEmbeddedWalletRef.current = true;
        createWallet()
          .catch(() => {
            setError("Couldn't create your wallet. Please try signing in again.");
            setConnecting(false);
            setSwitchingToEmail(false);
          })
          .finally(() => {
            creatingEmbeddedWalletRef.current = false;
          });
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ethProvider = await embedded.getEthereumProvider();
        if (cancelled) return;
        setAddress(embedded.address);
        setProvider(ethProvider);
        setProviderName(privy.user?.google ? "Google" : "Email");
        setIsPrivySession(true);
      } catch {
        if (!cancelled) setError("Failed to connect the embedded wallet.");
      } finally {
        if (!cancelled) {
          setConnecting(false);
          setSwitchingToEmail(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    address,
    switchingToEmail,
    privy.ready,
    privy.authenticated,
    privy.user,
    privyWallets,
    privyWalletsReady,
    createWallet,
  ]);

  // If the user opens the Privy login modal and closes it without completing
  // sign-in, stop the "Connecting…" spinner instead of leaving it stuck.
  useEffect(() => {
    if (wasPrivyModalOpenRef.current && !privy.isModalOpen && !privy.authenticated) {
      setConnecting(false);
      setSwitchingToEmail(false);
    }
    wasPrivyModalOpenRef.current = privy.isModalOpen;
  }, [privy.isModalOpen, privy.authenticated]);

  // Keep in sync with account switches / manual disconnects made in the wallet itself.
  useEffect(() => {
    if (!provider?.on) return;

    function handleAccountsChanged(...args: unknown[]) {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    }

    provider.on("accountsChanged", handleAccountsChanged);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [provider, disconnect]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      provider,
      providerName,
      connecting: connecting && !privy.error,
      error: error ?? (privy.error ? `Email sign-in is unavailable: ${privy.error.message}` : null),
      availableWallets,
      isChooserOpen,
      beginConnect,
      switchWallet,
      chooseWallet,
      connectWithEmail,
      closeChooser,
      disconnect,
    }),
    [
      address,
      provider,
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
      privy.error,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
