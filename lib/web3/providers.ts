"use client";

// Minimal EIP-1193 surface — every injected wallet (MetaMask, Core, Privy's
// embedded provider) implements at least this much.
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

// EIP-6963 ("Multi Injected Provider Discovery"): every installed wallet
// extension announces itself with its own name/icon instead of fighting over
// a single `window.ethereum`. This is how we offer a real Core-vs-MetaMask
// choice instead of guessing which one `window.ethereum` currently points to.
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: Eip1193Provider;
}

export function discoverProviders(timeoutMs = 250): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const found = new Map<string, EIP6963ProviderDetail>();

    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (detail?.info?.uuid) {
        found.set(detail.info.uuid, detail);
      }
    }

    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}

// Fallback for wallets that don't yet announce via EIP-6963.
export function getLegacyProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

// Core Wallet is Avalanche's native wallet, so it's the default pick whenever
// it's installed — MetaMask remains available as an explicit alternative.
export function isCoreProvider(detail: EIP6963ProviderDetail): boolean {
  return (
    detail.info.rdns.toLowerCase().includes("core") ||
    detail.info.name.toLowerCase().includes("core")
  );
}
