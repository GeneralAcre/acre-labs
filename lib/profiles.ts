import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeXHandle } from "./communities";
import type { ProfileRecord } from "./types";

const MAX_DISPLAY_NAME_LENGTH = 40;
// X handles are 1-15 characters, letters/digits/underscore.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

export async function getProfile(address: string): Promise<ProfileRecord | null> {
  const row = await prisma.profile.findUnique({ where: { address: address.toLowerCase() } });
  if (!row) return null;
  return { address: row.address, displayName: row.displayName, xHandle: row.xHandle };
}

// After a signed-in wallet makes a member card: if its profile has no X handle
// yet, link the card's handle so the card shows on that profile (and counts on
// the leaderboard). Never replaces a handle already set, and silently skips a
// handle another wallet has linked.
export async function linkHandleIfUnset(address: string, rawHandle: string): Promise<void> {
  const xHandle = normalizeXHandle(rawHandle);
  if (!HANDLE_RE.test(xHandle)) return;
  const where = { address: address.toLowerCase() };
  try {
    const existing = await prisma.profile.findUnique({ where });
    if (existing?.xHandle) return;
    await prisma.profile.upsert({ where, create: { ...where, xHandle }, update: { xHandle } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return;
    throw err;
  }
}

export type ProfileUpdateFailure = "invalid_name" | "invalid_handle" | "handle_taken";
export type ProfileUpdateResult =
  | { ok: true; profile: ProfileRecord }
  | { ok: false; reason: ProfileUpdateFailure };

// Empty strings clear a field (back to the shortened address / no linked
// member card), so a name or handle can be changed or removed at any time.
export async function upsertProfile(
  address: string,
  input: { displayName: string; xHandle: string }
): Promise<ProfileUpdateResult> {
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { ok: false, reason: "invalid_name" };
  }

  const xHandle = normalizeXHandle(input.xHandle);
  if (xHandle && !HANDLE_RE.test(xHandle)) {
    return { ok: false, reason: "invalid_handle" };
  }

  const data = { displayName: displayName || null, xHandle: xHandle || null };
  try {
    const row = await prisma.profile.upsert({
      where: { address: address.toLowerCase() },
      create: { address: address.toLowerCase(), ...data },
      update: data,
    });
    return { ok: true, profile: { address: row.address, displayName: row.displayName, xHandle: row.xHandle } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "handle_taken" };
    }
    throw err;
  }
}
