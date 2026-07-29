import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "acrelabs_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set — add a random value to .env.local (e.g. `openssl rand -hex 32`)."
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// Stateless session token: HMAC-signed `address.expiresAt`, no server-side
// session store needed. Verifying just means recomputing the HMAC and
// checking expiry, so it works fine against the in-memory (mock) store.
export function createSessionToken(address: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${address.toLowerCase()}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [address, expiresAtRaw, signature] = parts;

  const expected = sign(`${address}.${expiresAtRaw}`);
  const provided = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return address;
}
