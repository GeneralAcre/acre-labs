import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getVoucherSignerAddress } from "@/lib/web3/voucher";

// Lets the client learn the voucher signer's public address before calling
// EventDropFactory.createDrop(signer, baseURI) — without duplicating the
// private key's derived address into a NEXT_PUBLIC_* var that could drift
// from VOUCHER_SIGNER_PRIVATE_KEY on rotation.
export async function GET(request: NextRequest) {
  const owner = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!owner) {
    return NextResponse.json({ error: "Sign in to create a drop" }, { status: 401 });
  }

  return NextResponse.json({ signerAddress: getVoucherSignerAddress() });
}
