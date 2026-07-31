"use client";

import { BrowserProvider, Contract } from "ethers";
import { ensureActiveChain, resolveProvider, watchNftAsset, Web3ClaimError } from "./wallet";
import { findMintedTokenId } from "./transferLog";
import type { Eip1193Provider } from "./providers";

// Minting requires a voucher signed by the app's backend for this exact
// (eventId, wallet, deadline) — the contract rejects anything else, so a
// direct call bypassing the app's code/expiry/cap checks always reverts.
const CLAIM_ABI = [
  "function claim(string eventId, uint256 deadline, bytes signature) external returns (uint256)",
];

export { Web3ClaimError };

interface EthersLikeError {
  code?: string;
  reason?: string | null;
  shortMessage?: string;
}

function isEthersLikeError(err: unknown): err is EthersLikeError {
  return typeof err === "object" && err !== null && "code" in err;
}

// Wallets/ethers surface raw, dev-facing error blobs (full calldata, nested
// JSON-RPC payloads) — translates the common ones into something a claimer
// can actually act on instead of a wall of hex.
function friendlyMessage(err: unknown): string {
  if (isEthersLikeError(err)) {
    switch (err.code) {
      case "INSUFFICIENT_FUNDS":
        return "Your wallet doesn't have enough AVAX to cover the gas fee. Add a small amount of AVAX and try again.";
      case "ACTION_REJECTED":
        return "Transaction canceled in your wallet.";
      case "CALL_EXCEPTION": {
        const reason = err.reason ?? "";
        if (reason.includes("already claimed")) {
          return "This wallet has already claimed this drop.";
        }
        if (reason.includes("invalid voucher") || reason.includes("voucher expired")) {
          return "This claim link has expired. Refresh the page and try again.";
        }
        if (reason.includes("claiming paused")) {
          return "Claiming is currently paused by the organizer. Try again later.";
        }
        return "The transaction was rejected by the contract. Please try again.";
      }
      case "NETWORK_ERROR":
      case "TIMEOUT":
        return "Network error reaching the blockchain. Check your connection and try again.";
    }
  }
  return err instanceof Error ? err.message : "The claim transaction failed.";
}

export interface ClaimVoucher {
  eventId: string;
  deadline: number;
  signature: string;
}

export interface ClaimNftResult {
  txHash: string;
  walletAddress: string;
  tokenId: string | null;
}

export async function claimNftOnChain(
  contractAddress: string,
  voucher: ClaimVoucher,
  preferredProvider?: Eip1193Provider | null
): Promise<ClaimNftResult> {
  const injected = resolveProvider(preferredProvider);

  try {
    await injected.request({ method: "eth_requestAccounts" });
    await ensureActiveChain(injected);

    // ethers' BrowserProvider expects its own Eip1193Provider shape, which is
    // structurally compatible with ours but declared in a separate package.
    const provider = new BrowserProvider(injected as ConstructorParameters<typeof BrowserProvider>[0]);
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, CLAIM_ABI, signer);
    const walletAddress = await signer.getAddress();

    const tx = await contract.claim(voucher.eventId, voucher.deadline, voucher.signature);
    const receipt = await tx.wait();
    const txHash: string = receipt?.hash ?? tx.hash;

    const tokenId = receipt
      ? findMintedTokenId(receipt.logs, contractAddress, walletAddress)
      : null;

    if (tokenId) {
      // Best-effort nudge so the NFT shows up in the wallet's UI immediately
      // instead of waiting on the wallet's own chain-scanning to pick it up.
      await watchNftAsset(injected, { contractAddress, tokenId });
    }

    return { txHash, walletAddress, tokenId };
  } catch (err) {
    if (err instanceof Web3ClaimError) throw err;
    throw new Web3ClaimError(friendlyMessage(err));
  }
}
