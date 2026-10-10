import { NextRequest, NextResponse } from "next/server";
import { hasPracticeAccess } from "@/lib/practices/access";
import { deleteEntry, saveEntry } from "@/lib/practices/store";
import { validateDraft } from "@/lib/practices/validate";
import { loadWeekView } from "@/lib/practices/week-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function denied() {
  if (await hasPracticeAccess()) return null;
  return NextResponse.json({ error: "Enter the group access code." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const blocked = await denied();
  if (blocked) return blocked;

  const view = await loadWeekView(request.nextUrl.searchParams.get("week"));
  return NextResponse.json(view);
}

export async function POST(request: NextRequest) {
  const blocked = await denied();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The record could not be read." }, { status: 400 });
  }

  const parsed = validateDraft(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, fields: parsed.fields },
      { status: 400 },
    );
  }

  const saved = await saveEntry(parsed.draft);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }
  return NextResponse.json({ entry: saved.entry });
}

export async function DELETE(request: NextRequest) {
  const blocked = await denied();
  if (blocked) return blocked;
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Missing record." }, { status: 400 });
  }
  const result = await deleteEntry(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
