import { Interface, ZeroAddress } from "ethers";

// Shared between the client (parsing a tx receipt just returned by the
// wallet) and the server (parsing a receipt fetched independently via RPC to
// verify a claim) — no "use client" here, no browser-only APIs.
export const TRANSFER_EVENT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

export function findMintedTokenId(
  logs: readonly { address: string; topics: readonly string[]; data: string }[],
  contractAddress: string,
  walletAddress: string
): string | null {
  const iface = new Interface(TRANSFER_EVENT_ABI);

  for (const log of logs) {
    if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;

    try {
      const parsed = iface.parseLog(log);
      if (!parsed) continue;

      const { from, to, tokenId } = parsed.args;
      if (
        from === ZeroAddress &&
        String(to).toLowerCase() === walletAddress.toLowerCase()
      ) {
        return tokenId.toString();
      }
    } catch {
      // Not a Transfer event from this contract — ignore.
    }
  }

  return null;
}
