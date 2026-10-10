import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized, hasPracticeAccess } from "@/lib/practices/access";
import { mailedWeek, weekRangeFor } from "@/lib/practices/dates";
import { mailStatus, sendMail } from "@/lib/practices/mail";
import { getMailLog, listEntries, markMailSent } from "@/lib/practices/store";
import { buildWeekSummary } from "@/lib/practices/summary";
import type { WeekScope } from "@/lib/practices/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scopeFrom(value: unknown): WeekScope {
  return value === "current" ? "current" : "previous";
}

async function deliver(scope: WeekScope, force: boolean, fromCron = false) {
  const status = mailStatus();
  if (!status.ready) {
    return NextResponse.json(
      {
        error:
          "Weekly email is not configured. Add PRACTICE_MAIL_TO and SMTP or Resend settings.",
      },
      { status: 503 },
    );
  }

  const range = fromCron ? mailedWeek() : weekRangeFor(scope);
  const lastMail = await getMailLog();
  if (!force && lastMail?.weekStart === range.start && lastMail.scope === scope) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      subject: buildWeekSummary([], range.start, range.end).subject,
      message: "This week was already emailed. Send again only if you need a second copy.",
    });
  }

  const summary = buildWeekSummary(await listEntries(), range.start, range.end);
  await sendMail(summary);
  await markMailSent(range.start, scope);
  return NextResponse.json({
    ok: true,
    skipped: false,
    subject: summary.subject,
    to: status.to,
    recordCount: summary.recordCount,
  });
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return await deliver("previous", false, true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The email could not be sent.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasPracticeAccess())) {
    return NextResponse.json({ error: "Enter the group access code." }, { status: 401 });
  }
  let scope: WeekScope = "previous";
  let force = false;
  try {
    const body = (await request.json()) as { scope?: unknown; force?: unknown };
    scope = scopeFrom(body.scope);
    force = body.force === true;
  } catch {
    scope = "previous";
  }
  try {
    return await deliver(scope, force);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The email could not be sent.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
