import { JsonRpcProvider } from "ethers";
import { ACTIVE_CHAIN } from "./chains";
import { findMintedTokenId } from "./transferLog";

export type VerifyMintResult =
  | { ok: true; tokenId: string | null }
  | { ok: false; reason: string };

// Confirms, independently via RPC, that a claimed tx hash actually is a
// successful mint from the drop's contract to the claiming wallet — POST
// /api/claims used to just trust whatever the client sent, which let anyone
// fabricate a well-formed hash and get a "claim" recorded for free.
async function getReceipt(txHash: string) {
  const provider = new JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);
  try {
    return await provider.getTransactionReceipt(txHash);
  } catch {
    return null;
  }
}

export async function verifyMintTransaction(params: {
  txHash: string;
  contractAddress: string;
  walletAddress: string;
}): Promise<VerifyMintResult> {
  const receipt = await getReceipt(params.txHash);

  if (!receipt) {
    return { ok: false, reason: "Transaction not found on-chain." };
  }
  if (receipt.status !== 1) {
    return { ok: false, reason: "Transaction did not succeed." };
  }

  const tokenId = findMintedTokenId(receipt.logs, params.contractAddress, params.walletAddress);
  if (tokenId === null) {
    return {
      ok: false,
      reason: "No matching mint to this wallet was found in that transaction.",
    };
  }

  return { ok: true, tokenId };
}

// Re-derives a token ID for a claim that's already confirmed but is missing
// one — e.g. the RPC lookup at confirm time briefly failed, or the row
// predates tokenId being captured at all. Read-only, best-effort: returns
// null on any failure so callers can just skip the backfill for that view.
export async function resolveTokenId(params: {
  txHash: string;
  contractAddress: string;
  walletAddress: string;
}): Promise<string | null> {
  const receipt = await getReceipt(params.txHash);
  if (!receipt || receipt.status !== 1) return null;
  return findMintedTokenId(receipt.logs, params.contractAddress, params.walletAddress);
}
