import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Parse request body, call selected provider, return optimized prompt
  void request;
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 }
  );
}
