import { NextResponse } from "next/server";
import { CURRICULUM } from "@/lib/curriculum";

export async function GET() {
  return NextResponse.json({ curriculum: CURRICULUM });
}
