"use client";

import { BrowserProvider, Contract, Interface } from "ethers";
import { ensureActiveChain, resolveProvider, Web3ClaimError } from "./wallet";
import type { Eip1193Provider } from "./providers";

const FACTORY_ABI = [
  "function createDrop(address signer_, string calldata baseURI_) external returns (address clone)",
  "event DropCreated(address indexed clone, address indexed owner, address signer, string baseURI)",
];

export interface DeployDropResult {
  contractAddress: string;
  txHash: string;
}

interface EthersLikeError {
  code?: string;
}

function isEthersLikeError(err: unknown): err is EthersLikeError {
  return typeof err === "object" && err !== null && "code" in err;
}

// A clone deployed with a localhost/loopback baseURI can never resolve for
// anyone but the developer's own machine — every wallet/marketplace fetches
// tokenURI() over the public internet, so every badge minted from it would
// show up blank. Unlike the old deploy scripts, this fires per-drop, live,
// on mainnet, so it's checked before ever prompting a wallet signature
// rather than warn-and-continue.
function assertPubliclyReachableBaseURI(baseURI: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseURI);
  } catch {
    throw new Web3ClaimError(`"${baseURI}" isn't a valid metadata URL.`);
  }
  const isLoopback = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(parsed.hostname);
  if (isLoopback) {
    throw new Web3ClaimError(
      "You're running this from a local/dev URL, so the badge's metadata would never be reachable by wallets or marketplaces once minted. Create drops from the deployed app instead."
    );
  }
}

function friendlyDeployMessage(err: unknown): string {
  if (isEthersLikeError(err)) {
    switch (err.code) {
      case "INSUFFICIENT_FUNDS":
        return "Your wallet doesn't have enough AVAX to cover the gas fee to deploy this drop's contract. Add a small amount of AVAX and try again.";
      case "ACTION_REJECTED":
        return "Deployment canceled in your wallet.";
      case "NETWORK_ERROR":
      case "TIMEOUT":
        return "Network error reaching the blockchain. Check your connection and try again.";
    }
  }
  return err instanceof Error ? err.message : "Failed to deploy the drop's contract.";
}

// DropCreated is the source of truth for what actually got deployed — ethers
// v6 doesn't surface a real (non-static) tx's return value, so this mirrors
// findMintedTokenId's pattern (lib/web3/transferLog.ts) of decoding the
// receipt's own logs.
function findDeployedCloneAddress(
  logs: readonly { address: string; topics: readonly string[]; data: string }[],
  factoryAddress: string
): string | null {
  const iface = new Interface(FACTORY_ABI);

  for (const log of logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;

    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "DropCreated") {
        return String(parsed.args.clone);
      }
    } catch {
      // Not a DropCreated log from this factory — ignore.
    }
  }

  return null;
}

// Deploys a fresh, dedicated EIP-1167 clone for this drop — the organizer's
// own connected wallet pays gas and becomes the clone's owner. Mirrors
// claimNftOnChain's tx-send/wait/log-parse structure (lib/web3/claimNft.ts).
export async function deployDropContract(
  factoryAddress: string,
  signerAddress: string,
  baseURI: string,
  preferredProvider?: Eip1193Provider | null
): Promise<DeployDropResult> {
  assertPubliclyReachableBaseURI(baseURI);

  const injected = resolveProvider(preferredProvider);

  try {
    await injected.request({ method: "eth_requestAccounts" });
    await ensureActiveChain(injected);

    const provider = new BrowserProvider(injected as ConstructorParameters<typeof BrowserProvider>[0]);
    const signer = await provider.getSigner();
    const walletAddress = await signer.getAddress();

    // Checked up front, before ever prompting a transaction signature — a
    // zero balance would otherwise surface as an opaque INSUFFICIENT_FUNDS
    // rejection only after the wallet popup opens.
    const balance = await provider.getBalance(walletAddress);
    if (balance === BigInt(0)) {
      throw new Web3ClaimError(
        "Your wallet doesn't have enough AVAX to cover the gas fee to deploy this drop's contract. Add a small amount of AVAX and try again."
      );
    }

    const contract = new Contract(factoryAddress, FACTORY_ABI, signer);

    const tx = await contract.createDrop(signerAddress, baseURI);
    const receipt = await tx.wait();
    const txHash: string = receipt?.hash ?? tx.hash;

    const contractAddress = receipt ? findDeployedCloneAddress(receipt.logs, factoryAddress) : null;
    if (!contractAddress) {
      throw new Web3ClaimError(
        "The drop's contract was deployed, but its address couldn't be read back from the transaction. Check the explorer and try again."
      );
    }

    return { contractAddress, txHash };
  } catch (err) {
    if (err instanceof Web3ClaimError) throw err;
    throw new Web3ClaimError(friendlyDeployMessage(err));
  }
}
