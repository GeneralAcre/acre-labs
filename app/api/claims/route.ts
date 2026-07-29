import { NextRequest, NextResponse } from "next/server";
import { confirmClaim, getEvent, listClaimsByWallet } from "@/lib/store";
import { verifyMintTransaction } from "@/lib/web3/verifyMintTx";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "A valid wallet address is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ claims: await listClaimsByWallet(address) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const eventId = body?.eventId;
  const walletAddress = body?.walletAddress;
  const txHash = body?.txHash;

  if (typeof eventId !== "string") {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }
  const event = await getEvent(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (typeof walletAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: "walletAddress must be a valid 0x address" },
      { status: 400 }
    );
  }
  if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: "txHash must be a valid transaction hash" },
      { status: 400 }
    );
  }

  // Confirm the mint actually happened on-chain rather than trusting the
  // client-reported hash — otherwise anyone could POST a fabricated hash and
  // get a free "claim" recorded, which (with maxSupply) could also be used to
  // grief a capped drop's supply.
  const verification = await verifyMintTransaction({
    txHash,
    contractAddress: event.contractAddress,
    walletAddress,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 409 });
  }

  // Only upgrades a reservation created by /api/claim's code check — a bare
  // POST here with no prior validated claim is rejected.
  const claim = await confirmClaim({ eventId, walletAddress, txHash });
  if (!claim) {
    return NextResponse.json(
      { error: "No reserved claim found to confirm for this wallet and event." },
      { status: 409 }
    );
  }

  return NextResponse.json({ claim }, { status: 201 });
}
