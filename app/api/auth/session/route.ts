import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "ethers";
import { createSessionToken, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { isSignInMessageFresh, signInMessage } from "@/lib/authMessage";

export async function GET(request: NextRequest) {
  const address = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  return NextResponse.json({ address });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const address = body?.address;
  const issuedAt = body?.issuedAt;
  const signature = body?.signature;

  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "address must be a valid 0x address" }, { status: 400 });
  }
  if (typeof issuedAt !== "string" || !isSignInMessageFresh(issuedAt)) {
    return NextResponse.json(
      { error: "Sign-in request expired — try again." },
      { status: 400 }
    );
  }
  if (typeof signature !== "string") {
    return NextResponse.json({ error: "signature is required" }, { status: 400 });
  }

  const message = signInMessage(address, issuedAt);

  let recovered: string;
  try {
    recovered = verifyMessage(message, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: "Signature does not match address" }, { status: 401 });
  }

  const normalized = address.toLowerCase();
  const token = createSessionToken(normalized);

  const res = NextResponse.json({ address: normalized });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
