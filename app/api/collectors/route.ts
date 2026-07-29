import { NextResponse } from "next/server";
import { listCollectors } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ collectors: await listCollectors() });
}
