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
export async function verifyMintTransaction(params: {
  txHash: string;
  contractAddress: string;
  walletAddress: string;
}): Promise<VerifyMintResult> {
  const provider = new JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);

  let receipt;
  try {
    receipt = await provider.getTransactionReceipt(params.txHash);
  } catch {
    return { ok: false, reason: "Unable to reach the chain to verify this transaction." };
  }

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
