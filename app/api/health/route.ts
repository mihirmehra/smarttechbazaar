import { NextResponse } from "next/server";

// Simple health check endpoint for connectivity testing
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    timestamp: Date.now(),
    version: "1.0.0"
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
