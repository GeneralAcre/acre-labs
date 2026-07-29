import { AbiCoder, getBytes, keccak256, Wallet } from "ethers";
import { ACTIVE_CHAIN } from "./chains";

export interface ClaimVoucher {
  eventId: string;
  deadline: number; // unix seconds
  signature: string;
}

function getVoucherSigner(): Wallet {
  const privateKey = process.env.VOUCHER_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "VOUCHER_SIGNER_PRIVATE_KEY is not set — generate one via acre-labs-contracts/scripts/generate-signer-wallet.mjs and add it to .env.local."
    );
  }
  return new Wallet(privateKey);
}

// Mirrors EventDrop.sol's `claim()` digest exactly:
// keccak256(abi.encode(eventId, wallet, deadline, block.chainid, address(this)))
// signed as a standard personal-message (matches the contract's ecrecover
// over the "\x19Ethereum Signed Message:\n32" prefix).
export async function signClaimVoucher(params: {
  eventId: string;
  walletAddress: string;
  contractAddress: string;
  deadlineMs: number;
}): Promise<ClaimVoucher> {
  const deadline = Math.floor(params.deadlineMs / 1000);

  const digest = keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ["string", "address", "uint256", "uint256", "address"],
      [params.eventId, params.walletAddress, deadline, ACTIVE_CHAIN.id, params.contractAddress]
    )
  );

  const signer = getVoucherSigner();
  const signature = await signer.signMessage(getBytes(digest));

  return { eventId: params.eventId, deadline, signature };
}
