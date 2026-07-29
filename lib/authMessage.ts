// Shared between the client (which builds and signs this message) and the
// server (which rebuilds it independently to verify the signature) — must
// stay free of Node-only APIs so it can be imported from "use client" code.
const SIGN_IN_MESSAGE_TTL_MS = 5 * 60 * 1000;

export function signInMessage(address: string, issuedAt: string): string {
  return `Sign in to AcreLabs\nAddress: ${address}\nIssued At: ${issuedAt}`;
}

export function isSignInMessageFresh(issuedAt: string): boolean {
  const ts = Date.parse(issuedAt);
  return Number.isFinite(ts) && Math.abs(Date.now() - ts) <= SIGN_IN_MESSAGE_TTL_MS;
}
