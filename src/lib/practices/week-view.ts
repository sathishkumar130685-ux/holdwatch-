import { addDays, isISODate, todayISO, weekStartMonday } from "./dates";
import { mailStatus } from "./mail";
import { getMailLog, listEntriesForWeek } from "./store";
import type { WeekView } from "./types";

export async function loadWeekView(anchor?: string | null): Promise<WeekView> {
  const today = todayISO();
  const requested = anchor && isISODate(anchor) ? anchor : today;
  const weekStart = weekStartMonday(requested);
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
    mail: { ready: mail.ready, to: mail.to, via: mail.via },
    lastMail,
    ephemeralDisk: Boolean(process.env.VERCEL),
  };
}
