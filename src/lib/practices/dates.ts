import { PRACTICE_TIMEZONE } from "./catalog";
import type { WeekScope } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRACTICE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const dt = utcDate(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday of the calendar week that contains `iso` (treated as a calendar date). */
export function weekStartMonday(iso: string): string {
  const day = utcDate(iso).getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(iso, delta);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function weekRangeFor(scope: WeekScope, now = new Date()): {
  start: string;
  end: string;
} {
  const currentStart = weekStartMonday(todayISO(now));
  const start = scope === "previous" ? addDays(currentStart, -7) : currentStart;
  return { start, end: addDays(start, 6) };
}

export function formatDay(iso: string): string {
  const dt = utcDate(iso);
  return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

export function formatWeekRange(start: string, end: string): string {
  const a = utcDate(start);
  const b = utcDate(end);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === b.getUTCMonth();
  if (sameMonth) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  const left = `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}${sameYear ? "" : ` ${a.getUTCFullYear()}`}`;
  return `${left} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[utcDate(iso).getUTCDay()];
}
