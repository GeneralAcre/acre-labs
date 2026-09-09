import { NextRequest, NextResponse } from "next/server";
import { listEvents, toPublicEvent } from "@/lib/store";
import type { Product } from "@/lib/types";

const PRODUCTS: Product[] = ["badge", "content"];

export async function GET(request: NextRequest) {
  const productParam = request.nextUrl.searchParams.get("product");
  const product = PRODUCTS.find((p) => p === productParam);

  const events = (await listEvents(product)).map(toPublicEvent);
  return NextResponse.json({ events });
}
