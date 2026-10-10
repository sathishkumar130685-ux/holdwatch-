import { PRACTICE_NAMES } from "./catalog";
import { formatDay, formatWeekRange, weekDates } from "./dates";
import type { PracticeEntry } from "./types";

export type WeekSummary = {
  start: string;
  end: string;
  label: string;
  subject: string;
  text: string;
  html: string;
  recordCount: number;
  peopleCount: number;
};

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function serviceHoursValue(label: string | null): number {
  if (!label) return 0;
  const match = /^(\d+)/.exec(label);
  return match ? Number(match[1]) : 0;
}

function practiceLines(entry: PracticeEntry): string[] {
  const lines: string[] = [];
  if (entry.meditation.length) lines.push(`Meditation: ${entry.meditation.join("; ")}`);
  if (entry.irfr) lines.push(`IRFR & Blue Triangle: ${entry.irfr}`);
  if (entry.serviceHours) lines.push(`Service: ${entry.serviceHours}`);
  const sex = [...entry.sexEnergy];
  if (entry.sexEnergyOther) sex.push(entry.sexEnergyOther);
  if (sex.length) lines.push(`Sex Energy Transmutation: ${sex.join("; ")}`);
  const healing = [...entry.selfHealing];
  if (entry.selfHealingOther) healing.push(entry.selfHealingOther);
  if (healing.length) lines.push(`Self Healing: ${healing.join("; ")}`);
  if (entry.higherLevel) lines.push(`Arhatic Higher levels: ${entry.higherLevel}`);
  if (entry.understanding || entry.understandingOther) {
    lines.push(
      `Understanding Meditation: ${entry.understandingOther || entry.understanding}`,
    );
  }
  if (entry.concretizing || entry.concretizingOther) {
    lines.push(
      `Concretizing Meditation: ${entry.concretizingOther || entry.concretizing}`,
    );
  }
  if (entry.bookReading || entry.bookReadingOther) {
    lines.push(`Book Reading: ${entry.bookReadingOther || entry.bookReading}`);
  }
  if (entry.otherPractices) lines.push(`Any Other Practices: ${entry.otherPractices}`);
  return lines;
}

export function buildWeekSummary(
  allEntries: PracticeEntry[],
  start: string,
  end: string,
): WeekSummary {
  const dates = new Set(weekDates(start));
  const entries = allEntries
    .filter((entry) => dates.has(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  const label = formatWeekRange(start, end);
  const byName = new Map<string, PracticeEntry[]>();
  for (const entry of entries) {
    const list = byName.get(entry.name) ?? [];
    list.push(entry);
    byName.set(entry.name, list);
  }

  const logged = PRACTICE_NAMES.filter((name) => byName.has(name));
  const missing = PRACTICE_NAMES.filter((name) => !byName.has(name));
  const textBlocks: string[] = [
    "Arhatic Yoga Practice",
    `Week of ${label}`,
    "",
    `${entries.length} record${entries.length === 1 ? "" : "s"} · ${logged.length} of ${PRACTICE_NAMES.length} people`,
    "",
  ];

  const htmlPeople: string[] = [];

  for (const name of logged) {
    const rows = byName.get(name) ?? [];
    const hours = rows.reduce((sum, row) => sum + serviceHoursValue(row.serviceHours), 0);
    const heading = `${name} — ${rows.length} day${rows.length === 1 ? "" : "s"}${hours ? ` · service ${hours} hr${hours === 1 ? "" : "s"}` : ""}`;
    textBlocks.push(heading);
    const htmlDays: string[] = [];
    for (const row of rows) {
      const lines = practiceLines(row);
      textBlocks.push(`  ${formatDay(row.date)}`);
      for (const line of lines) textBlocks.push(`    ${line}`);
      htmlDays.push(
        `<div style="margin:0 0 10px 0"><div style="font-weight:600">${esc(formatDay(row.date))}</div><div style="color:#3d4a45">${lines.map((line) => esc(line)).join("<br>")}</div></div>`,
      );
    }
    textBlocks.push("");
    htmlPeople.push(
      `<section style="margin:0 0 18px 0;padding:14px 16px;background:#fffaf3;border:1px solid #e6dccb;border-radius:12px"><h2 style="margin:0 0 10px;font-size:16px;color:#1c2430">${esc(heading)}</h2>${htmlDays.join("")}</section>`,
    );
  }

  if (missing.length) {
    textBlocks.push("No record this week:");
    for (const name of missing) textBlocks.push(`  ${name}`);
    textBlocks.push("");
  }

  const htmlMissing = missing.length
    ? `<p style="margin:18px 0 0;color:#3d4a45"><strong>No record this week:</strong> ${missing.map((name) => esc(name)).join(", ")}</p>`
    : `<p style="margin:18px 0 0;color:#0f6e6b">Everyone in the group has a record this week.</p>`;

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4efe6;font-family:Georgia,serif;color:#1c2430"><div style="max-width:640px;margin:0 auto"><p style="letter-spacing:0.14em;text-transform:uppercase;font-size:12px;color:#0f6e6b;margin:0 0 6px">Arhatic Yoga Practice</p><h1 style="font-weight:500;font-size:28px;margin:0 0 8px">Week of ${esc(label)}</h1><p style="margin:0 0 20px;color:#3d4a45">${entries.length} record${entries.length === 1 ? "" : "s"} · ${logged.length} of ${PRACTICE_NAMES.length} people</p>${htmlPeople.join("") || `<p style="color:#3d4a45">No records were saved this week.</p>`}${htmlMissing}</div></body></html>`;

  return {
    start,
    end,
    label,
    subject: `Arhatic Yoga practice — ${label}`,
    text: textBlocks.join("\n").trim() + "\n",
    html,
    recordCount: entries.length,
    peopleCount: logged.length,
  };
}
