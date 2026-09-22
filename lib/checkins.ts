import { Prisma, type CheckIn as PrismaCheckIn } from "@prisma/client";
import { prisma } from "./prisma";
import type { CheckInRecord } from "./types";

const MAX_NAME_LENGTH = 60;
// X handles are 1-15 characters, letters/digits/underscore.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function toCheckInRecord(row: PrismaCheckIn): CheckInRecord {
  return {
    id: row.id,
    name: row.name,
    xHandle: row.xHandle,
    createdAt: row.createdAt.getTime(),
  };
}

// Case-insensitive and tolerant of a leading "@" so "@Acre" and "acre" collide.
export function normalizeXHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export type CheckInFailureReason = "invalid_name" | "invalid_handle" | "already_checked_in";
export type CheckInResult =
  | { ok: true; checkIn: CheckInRecord }
  | { ok: false; reason: CheckInFailureReason };

export async function createCheckIn(name: string, rawHandle: string): Promise<CheckInResult> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > MAX_NAME_LENGTH) {
    return { ok: false, reason: "invalid_name" };
  }

  const xHandle = normalizeXHandle(rawHandle);
  if (!HANDLE_RE.test(xHandle)) {
    return { ok: false, reason: "invalid_handle" };
  }

  try {
    const created = await prisma.checkIn.create({
      data: { name: trimmedName, xHandle },
    });
    return { ok: true, checkIn: toCheckInRecord(created) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, reason: "already_checked_in" };
    }
    throw err;
  }
}

export async function listCheckIns(): Promise<CheckInRecord[]> {
  const rows = await prisma.checkIn.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toCheckInRecord);
}
