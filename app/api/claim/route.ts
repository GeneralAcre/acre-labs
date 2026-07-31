import { NextRequest, NextResponse } from "next/server";
import { releasePendingClaim, toPublicEvent, validateAndReserveClaim } from "@/lib/store";
import { signClaimVoucher } from "@/lib/web3/voucher";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const eventId = body?.eventId;
  const code = body?.code;
  const walletAddress = body?.walletAddress;

  if (typeof eventId !== "string" || typeof code !== "string") {
    return NextResponse.json(
      { ok: false, reason: "invalid_request" },
      { status: 400 }
    );
  }
  if (typeof walletAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_request", error: "walletAddress must be a valid 0x address" },
      { status: 400 }
    );
  }

  const result = await validateAndReserveClaim(eventId, code, walletAddress);

  if (!result.ok) {
    const status =
      result.reason === "not_found" ? 404 : result.reason === "sold_out" ? 409 : 400;
    return NextResponse.json(result, { status });
  }

  // The voucher is what actually authorizes the on-chain mint — the
  // contract only accepts a claim signed by this trusted signer, so this
  // check (code, expiry, cap, duplicate) is binding on-chain, not just
  // advisory in the app.
  const voucher = await signClaimVoucher({
    eventId,
    walletAddress,
    contractAddress: result.event.contractAddress,
    deadlineMs: result.event.expiresAt,
  });

  return NextResponse.json({ ok: true, event: toPublicEvent(result.event), voucher });
}

// Called right after a claim reservation's on-chain mint fails client-side
// (wallet rejected it, insufficient funds, RPC error) so the slot frees up
// immediately instead of sitting pending for the full reservation TTL.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const eventId = body?.eventId;
  const walletAddress = body?.walletAddress;

  if (typeof eventId !== "string") {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }
  if (typeof walletAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }

  const released = await releasePendingClaim(eventId, walletAddress);
  return NextResponse.json({ ok: released });
}
