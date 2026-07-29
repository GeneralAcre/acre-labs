import { NextResponse } from "next/server";
import { listEvents, toPublicEvent } from "@/lib/store";

export async function GET() {
  const events = (await listEvents()).map(toPublicEvent);
  return NextResponse.json({ events });
}
