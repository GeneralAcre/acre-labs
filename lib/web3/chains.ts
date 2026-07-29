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

// Every drop mints from this single AcreLabs-operated contract rather than
// organizers bringing their own — placeholder until the real ERC-721 drop
// contract is deployed. Override via env without a code change once it is.
export const SHARED_DROP_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_DROP_CONTRACT_ADDRESS ??
  "0x00000000000000000000000000000000DeaDBeef";
