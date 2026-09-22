import { NextRequest, NextResponse } from "next/server";
import { createCheckIn, listCheckIns } from "@/lib/checkins";

export async function GET() {
  const checkIns = await listCheckIns();
  return NextResponse.json({ checkIns });
}

const ERROR_MESSAGES: Record<string, { message: string; status: number }> = {
  invalid_name: { message: "Enter your name.", status: 400 },
  invalid_handle: {
    message: "Enter a valid X handle (letters, numbers, underscore — up to 15 characters).",
    status: 400,
  },
  already_checked_in: { message: "That X handle has already checked in.", status: 409 },
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = body?.name;
  const xHandle = body?.xHandle;

  if (typeof name !== "string" || typeof xHandle !== "string") {
    return NextResponse.json({ error: "name and xHandle are required" }, { status: 400 });
  }

  const result = await createCheckIn(name, xHandle);
  if (!result.ok) {
    const { message, status } = ERROR_MESSAGES[result.reason];
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ checkIn: result.checkIn }, { status: 201 });
}
