import { addDays, isISODate, todayISO, weekAnchorISO, weekStartSunday } from "./dates";
import { mailStatus } from "./mail";
import { getMailLog, listEntriesForWeek } from "./store";
import type { WeekView } from "./types";

export async function loadWeekView(anchor?: string | null): Promise<WeekView> {
  const today = todayISO();
  const currentWeekStart = weekStartSunday(weekAnchorISO());
  const requested = anchor && isISODate(anchor) ? anchor : currentWeekStart;
  const weekStart = weekStartSunday(requested);
  const [entries, lastMail] = await Promise.all([
    listEntriesForWeek(weekStart),
    getMailLog(),
  ]);
  const mail = mailStatus();
  return {
    entries,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    today,
    currentWeekStart,
    mail: { ready: mail.ready, to: mail.to, via: mail.via },
    lastMail,
    ephemeralDisk: Boolean(process.env.VERCEL),
  };
}
