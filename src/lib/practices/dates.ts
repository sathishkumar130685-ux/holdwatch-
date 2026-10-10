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

const WEEK_ROLL_MINUTES = 5 * 60 + 30;

type ZonedClock = {
  iso: string;
  weekday: string;
  minutes: number;
};

function zonedClock(now: Date): ZonedClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PRACTICE_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(value("hour"));
  if (hour === 24) hour = 0;
  return {
    iso: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
    minutes: hour * 60 + Number(value("minute")),
  };
}

export function todayISO(now = new Date()): string {
  return zonedClock(now).iso;
}

/**
 * A week is Sunday–Saturday in India. It rolls to the next week on Sunday at 5:30 AM,
 * which is when the summary email goes out.
 */
export function weekAnchorISO(now = new Date()): string {
  const clock = zonedClock(now);
  const beforeSundayMail =
    clock.weekday === "Sun" && clock.minutes < WEEK_ROLL_MINUTES;
  return beforeSundayMail ? addDays(clock.iso, -1) : clock.iso;
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

/** Sunday of the calendar week that contains `iso`. */
export function weekStartSunday(iso: string): string {
  const day = utcDate(iso).getUTCDay();
  return addDays(iso, -day);
}

/** Sunday–Saturday week the Sunday morning email should contain. */
export function mailedWeek(now = new Date()): { start: string; end: string } {
  const clock = zonedClock(now);
  if (clock.weekday === "Sun") {
    const end = addDays(clock.iso, -1);
    return { start: weekStartSunday(end), end };
  }
  return weekRangeFor("previous", now);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function weekRangeFor(scope: WeekScope, now = new Date()): {
  start: string;
  end: string;
} {
  const currentStart = weekStartSunday(weekAnchorISO(now));
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
