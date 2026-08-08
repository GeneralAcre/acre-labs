export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
}

export const AVALANCHE_FUJI: ChainConfig = {
  id: 43113,
  name: "Avalanche Fuji Testnet",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorerUrl: "https://testnet.snowtrace.io",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
};

export const AVALANCHE_C_CHAIN: ChainConfig = {
  id: 43114,
  name: "Avalanche C-Chain",
  rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
  explorerUrl: "https://snowtrace.io",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
};

// Defaults to Fuji testnet; set NEXT_PUBLIC_AVALANCHE_NETWORK=mainnet to claim
// against Avalanche C-Chain instead.
export const ACTIVE_CHAIN: ChainConfig =
  process.env.NEXT_PUBLIC_AVALANCHE_NETWORK === "mainnet"
    ? AVALANCHE_C_CHAIN
    : AVALANCHE_FUJI;

export function toHexChainId(id: number): string {
  return `0x${id.toString(16)}`;
}

export function txExplorerUrl(txHash: string): string {
  return `${ACTIVE_CHAIN.explorerUrl}/tx/${txHash}`;
}

export function addressExplorerUrl(address: string): string {
  return `${ACTIVE_CHAIN.explorerUrl}/address/${address}`;
}

// Drops created before the factory/clone migration all mint from this one
// AcreLabs-operated contract. Still load-bearing, not just historical: the
// claim flow (lib/web3/voucher.ts, lib/web3/claimNft.ts) compares a drop's
// contractAddress against this value to decide whether to use the OLD
// (eventId-bearing) or NEW voucher digest/ABI, since any still-open historic
// drop still points at this exact contract and expects the old claim()
// signature.
export const SHARED_DROP_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_DROP_CONTRACT_ADDRESS ??
  "0x00000000000000000000000000000000DeaDBeef";

// Organizers deploy their own dedicated EIP-1167 clone via this factory when
// creating a new drop (lib/web3/factory.ts) — their wallet pays the gas and
// becomes the clone's owner. Set after running `npm run deploy-factory` in
// acre-labs-contracts.
export const DROP_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_DROP_FACTORY_ADDRESS ?? "";
