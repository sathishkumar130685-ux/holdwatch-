import { NextRequest, NextResponse } from "next/server";
import { grantPracticeAccess, practiceAccessCode } from "@/lib/practices/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!practiceAccessCode()) {
    return NextResponse.json({ ok: true });
  }
  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : "";
  } catch {
    code = "";
  }
  const ok = await grantPracticeAccess(code);
  if (!ok) {
    return NextResponse.json({ error: "That access code is not right." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
