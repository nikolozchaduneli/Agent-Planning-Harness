import { NextRequest, NextResponse } from "next/server";
import { readServerState, writeServerState } from "@/lib/server-store";
import type { AppState } from "@/lib/types";

export async function GET() {
  const state = await readServerState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  try {
    const state = (await req.json()) as AppState;
    await writeServerState(state);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
