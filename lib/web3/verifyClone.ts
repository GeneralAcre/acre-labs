import { JsonRpcProvider } from "ethers";
import { ACTIVE_CHAIN } from "./chains";

// EIP-1167 minimal-proxy runtime bytecode is fully deterministic given the
// implementation address it delegates to — this lets one eth_getCode call
// plus a string compare prove a submitted address really came from
// EventDropFactory, no event-log queries needed.
function expectedCloneRuntimeCode(implementation: string): string {
  const addr = implementation.toLowerCase().replace(/^0x/, "");
  return `0x363d3d373d3d3d363d73${addr}5af43d82803e903d91602b57fd5bf3`;
}

// Never trust a client-submitted on-chain fact without verifying it
// independently via RPC — same rigor lib/web3/verifyMintTx.ts applies to
// claimed tx hashes. Best-effort: if DROP_IMPLEMENTATION_ADDRESS isn't
// configured yet (e.g. local dev before running deploy-factory), skip
// verification rather than hard-block drop creation.
export async function isGenuineDropClone(contractAddress: string): Promise<boolean> {
  const implementation = process.env.DROP_IMPLEMENTATION_ADDRESS;
  if (!implementation) return true;

  const provider = new JsonRpcProvider(ACTIVE_CHAIN.rpcUrl);
  const code = await provider.getCode(contractAddress);
  return code.toLowerCase() === expectedCloneRuntimeCode(implementation);
}
