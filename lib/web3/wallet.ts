"use client";

import { ACTIVE_CHAIN, toHexChainId } from "./chains";
import { getLegacyProvider, type Eip1193Provider } from "./providers";

export class Web3ClaimError extends Error {}

interface ProviderRpcError {
  code: number;
  message?: string;
}

function isProviderRpcError(err: unknown): err is ProviderRpcError {
  return typeof err === "object" && err !== null && "code" in err;
}

// Prefer an explicitly chosen EIP-6963 provider (e.g. the user picked "Core"
// from the wallet-select dropdown); fall back to whatever `window.ethereum`
// currently points to for wallets that don't announce themselves yet.
export function resolveProvider(preferred?: Eip1193Provider | null): Eip1193Provider {
  const provider = preferred ?? getLegacyProvider();
  if (!provider) {
    throw new Web3ClaimError(
      "No wallet found. Install Core (core.app/tools) or MetaMask to continue."
    );
  }
  return provider;
}

export async function ensureActiveChain(provider: Eip1193Provider): Promise<void> {
  const targetChainId = toHexChainId(ACTIVE_CHAIN.id);
  const currentChainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId === targetChainId) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
  } catch (switchError: unknown) {
    // 4902: chain not yet added to the wallet.
    if (isProviderRpcError(switchError) && switchError.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetChainId,
            chainName: ACTIVE_CHAIN.name,
            nativeCurrency: ACTIVE_CHAIN.nativeCurrency,
            rpcUrls: [ACTIVE_CHAIN.rpcUrl],
            blockExplorerUrls: [ACTIVE_CHAIN.explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

// Address-only connect for read views (e.g. the collection page) that don't
// need to submit a transaction, so there's no need to force a chain switch.
export async function connectWallet(preferred?: Eip1193Provider | null): Promise<string> {
  const provider = resolveProvider(preferred);
  try {
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts[0]) {
      throw new Web3ClaimError("No account returned by the wallet.");
    }
    return accounts[0];
  } catch (err) {
    if (err instanceof Web3ClaimError) throw err;
    const message = err instanceof Error ? err.message : "Failed to connect wallet.";
    throw new Web3ClaimError(message);
  }
}

// Used for the organizer sign-in flow (proving wallet ownership to the
// server) — `personal_sign` is the standard EIP-1193 method every injected
// wallet and Privy's embedded-wallet provider both implement.
export async function signMessage(
  provider: Eip1193Provider,
  address: string,
  message: string
): Promise<string> {
  try {
    return (await provider.request({
      method: "personal_sign",
      params: [message, address],
    })) as string;
  } catch (err) {
    if (err instanceof Web3ClaimError) throw err;
    const msg = err instanceof Error ? err.message : "Failed to sign message.";
    throw new Web3ClaimError(msg);
  }
}

// Prompts the wallet (Core, MetaMask, …) to add the claimed NFT to its asset
// list — the same `wallet_watchAsset` call used for "Add token", extended by
// most wallets to accept ERC-721. Best-effort only: many wallets also
// auto-detect the mint on their own, and some may not support this extension,
// so a rejection/error here should never block the claim success screen.
export async function watchNftAsset(
  provider: Eip1193Provider,
  params: { contractAddress: string; tokenId: string }
): Promise<boolean> {
  try {
    const wasAdded = await provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC721",
        options: {
          address: params.contractAddress,
          tokenId: params.tokenId,
        },
      },
    });
    return Boolean(wasAdded);
  } catch {
    return false;
  }
}
