import { AbiCoder, getBytes, keccak256, Wallet } from "ethers";
import { ACTIVE_CHAIN, SHARED_DROP_CONTRACT_ADDRESS } from "./chains";

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

export function getVoucherSignerAddress(): string {
  return getVoucherSigner().address;
}

function isLegacySharedContract(contractAddress: string): boolean {
  return contractAddress.toLowerCase() === SHARED_DROP_CONTRACT_ADDRESS.toLowerCase();
}

// Two digest shapes coexist during the factory/clone migration:
//  - Legacy (SHARED_DROP_CONTRACT_ADDRESS, historic drops only): mirrors the
//    old shared EventDrop.sol's claim() exactly —
//    keccak256(abi.encode(eventId, wallet, deadline, block.chainid, address(this)))
//  - New (any per-drop clone from EventDropFactory): mirrors
//    EventDropImplementation.sol's claim() — eventId dropped, since one
//    clone == one drop now —
//    keccak256(abi.encode(wallet, deadline, block.chainid, address(this)))
// Both are signed as a standard personal-message (matches each contract's
// ecrecover over the "\x19Ethereum Signed Message:\n32" prefix).
export async function signClaimVoucher(params: {
  eventId: string;
  walletAddress: string;
  contractAddress: string;
  deadlineMs: number;
}): Promise<ClaimVoucher> {
  const deadline = Math.floor(params.deadlineMs / 1000);

  const digest = isLegacySharedContract(params.contractAddress)
    ? keccak256(
        AbiCoder.defaultAbiCoder().encode(
          ["string", "address", "uint256", "uint256", "address"],
          [params.eventId, params.walletAddress, deadline, ACTIVE_CHAIN.id, params.contractAddress]
        )
      )
    : keccak256(
        AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256", "address"],
          [params.walletAddress, deadline, ACTIVE_CHAIN.id, params.contractAddress]
        )
      );

  const signer = getVoucherSigner();
  const signature = await signer.signMessage(getBytes(digest));

  return { eventId: params.eventId, deadline, signature };
}
