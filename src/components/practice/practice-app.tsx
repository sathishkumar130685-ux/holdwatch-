"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BOOK_READING_OPTIONS,
  HIGHER_LEVELS,
  IRFR_OPTIONS,
  MEDITATIONS,
  PRACTICE_NAMES,
  SELF_HEALING_OPTIONS,
  SERVICE_HOURS,
  SEX_ENERGY_OPTIONS,
  WEEKLY_ONLY,
} from "@/lib/practices/catalog";
import {
  addDays,
  formatDay,
  formatWeekRange,
  todayISO,
  weekDates,
  weekStartMonday,
  weekdayShort,
} from "@/lib/practices/dates";
import { buildWeekSummary } from "@/lib/practices/summary";
import type { PracticeEntry, WeekView } from "@/lib/practices/types";
import { emptyDraft } from "@/lib/practices/validate";

type FormState = ReturnType<typeof emptyDraft> & {
  id?: string;
  sexEnergyOtherOn: boolean;
  selfHealingOtherOn: boolean;
  understandingChoice: string | null;
  concretizingChoice: string | null;
  bookChoice: string | null;
};

const inputClass =
  "w-full rounded-xl border border-[#e0d4c3] bg-white px-3 py-2.5 text-base text-[#1c2430] outline-none focus:border-[#0f6e6b] focus:ring-3 focus:ring-[#0f6e6b]/20";

function blankForm(date: string, name = ""): FormState {
  return {
    ...emptyDraft(date),
    name,
    sexEnergyOtherOn: false,
    selfHealingOtherOn: false,
    understandingChoice: null,
    concretizingChoice: null,
    bookChoice: null,
  };
}

function formFromEntry(entry: PracticeEntry): FormState {
  return {
    ...entry,
    sexEnergyOtherOn: Boolean(entry.sexEnergyOther),
    selfHealingOtherOn: Boolean(entry.selfHealingOther),
    understandingChoice: entry.understandingOther
      ? "other"
      : entry.understanding,
    concretizingChoice: entry.concretizingOther ? "other" : entry.concretizing,
    bookChoice: entry.bookReadingOther ? "other" : entry.bookReading,
    understandingOther: entry.understandingOther,
    concretizingOther: entry.concretizingOther,
    bookReadingOther: entry.bookReadingOther,
  };
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-left text-sm leading-snug transition ${
        selected
          ? "border-[#0f6e6b] bg-[#0f6e6b] text-white"
          : "border-[#e0d4c3] bg-white text-[#1c2430] hover:border-[#0f6e6b]/50"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  legend,
  hint,
  error,
  children,
}: {
  legend: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-[#1c2430]">{legend}</legend>
      {hint ? <p className="text-sm text-[#5c6b66]">{hint}</p> : null}
      {children}
      {error ? <p className="text-sm text-[#9a3b22]">{error}</p> : null}
    </fieldset>
  );
}

export function PracticeApp({
  initialUnlocked,
  accessRequired,
  initialWeek,
}: {
  initialUnlocked: boolean;
  accessRequired: boolean;
  initialWeek: WeekView | null;
}) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [weekStart, setWeekStart] = useState(
    () => initialWeek?.weekStart ?? weekStartMonday(todayISO()),
  );
  const [payload, setPayload] = useState<WeekView | null>(initialWeek);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    blankForm(initialWeek?.today ?? todayISO()),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const loadWeek = useCallback(async (anchor: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/practices?week=${anchor}`);
      const data = (await response.json()) as WeekView & { error?: string };
      if (!response.ok) {
        if (response.status === 401) setUnlocked(false);
        throw new Error(data.error || "Could not load records.");
      }
      setPayload(data);
      setWeekStart(data.weekStart);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  const entries = useMemo(() => payload?.entries ?? [], [payload]);
  const days = weekDates(payload?.weekStart ?? weekStart);
  const byKey = useMemo(() => {
    const map = new Map<string, PracticeEntry>();
    for (const entry of entries) map.set(`${entry.name}|${entry.date}`, entry);
    return map;
  }, [entries]);

  const summary = useMemo(() => {
    if (!payload) return null;
    return buildWeekSummary(entries, payload.weekStart, payload.weekEnd);
  }, [entries, payload]);

  function toggleList(
    key: "meditation" | "sexEnergy" | "selfHealing",
    value: string,
  ) {
    setForm((current) => {
      const has = current[key].includes(value);
      return {
        ...current,
        [key]: has ? current[key].filter((item) => item !== value) : [...current[key], value],
      };
    });
  }

  function openCell(name: string, date: string) {
    const existing = byKey.get(`${name}|${date}`);
    setErrors({});
    setForm(existing ? formFromEntry(existing) : blankForm(date, name));
    document.getElementById("practice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const response = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          understanding: form.understandingChoice,
          concretizing: form.concretizingChoice,
          bookReading: form.bookChoice,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
        entry?: PracticeEntry;
      };
      if (!response.ok) {
        setErrors(data.fields ?? {});
        toast.error(data.error || "Could not save.");
        return;
      }
      toast.success(`Saved ${data.entry?.name}'s record for ${formatDay(data.entry?.date ?? form.date)}.`);
      setForm(blankForm(payload?.today ?? todayISO()));
      await loadWeek(form.date);
      document.getElementById("practice-week")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!form.id) return;
    if (!window.confirm(`Remove ${form.name}'s record for ${formatDay(form.date)}?`)) return;
    const response = await fetch(`/api/practices?id=${encodeURIComponent(form.id)}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error || "Could not remove the record.");
      return;
    }
    toast.success("Record removed.");
    const anchor = form.date;
    setForm(blankForm(payload?.today ?? todayISO()));
    await loadWeek(anchor);
  }

  async function sendWeek(scope: "previous" | "current", force = false) {
    setSending(true);
    try {
      const response = await fetch("/api/practices/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, force }),
      });
      const data = (await response.json()) as {
        error?: string;
        skipped?: boolean;
        subject?: string;
        to?: string[];
        message?: string;
      };
      if (!response.ok) {
        toast.error(data.error || "The email could not be sent.");
        return;
      }
      if (data.skipped) {
        const again = window.confirm(
          `${data.message ?? "Already sent."}\n\nSend another copy now?`,
        );
        if (again) await sendWeek(scope, true);
        return;
      }
      toast.success(`Sent “${data.subject}” to ${(data.to ?? []).join(", ")}.`);
      await loadWeek(payload?.weekStart ?? weekStart);
    } finally {
      setSending(false);
    }
  }

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setCodeError("");
    const response = await fetch("/api/practices/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      setCodeError("That access code is not right.");
      return;
    }
    setUnlocked(true);
    await loadWeek(todayISO());
  }

  if (!unlocked && accessRequired) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-16">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#0f6e6b] uppercase">
          Arhatic Yoga
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-practice-display)] text-4xl font-medium text-[#1c2430]">
          Practice record
        </h1>
        <p className="mt-3 text-[#3d4a45]">
          Enter the group access code to record a practice or read the week.
        </p>
        <form onSubmit={unlock} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold" htmlFor="access-code">
            Access code
          </label>
          <input
            id="access-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={inputClass}
          />
          {codeError ? <p className="text-sm text-[#9a3b22]">{codeError}</p> : null}
          <button
            type="submit"
            className="rounded-full bg-[#0f6e6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0c5b59]"
          >
            Continue
          </button>
        </form>
      </main>
    );
  }

  const previousStart = addDays(payload?.weekStart ?? weekStart, -7);
  const nextStart = addDays(payload?.weekStart ?? weekStart, 7);
  const thisWeekStart = payload ? weekStartMonday(payload.today) : weekStart;
  const atThisWeek = payload?.weekStart === thisWeekStart;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6 border-b border-[#e0d4c3] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#0f6e6b] uppercase">
            Arhatic Yoga Practice
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-practice-display)] text-4xl font-medium tracking-tight text-[#1c2430] sm:text-5xl">
            Daily record
          </h1>
          <p className="mt-3 max-w-xl text-[#3d4a45]">
            The same log as the group form. A summary email goes out every Monday
            morning for the week that just ended.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={sending || !payload?.mail.ready}
            onClick={() => void sendWeek("previous")}
            className="rounded-full bg-[#c4552a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a84722] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending…" : "Email last week"}
          </button>
          <button
            type="button"
            disabled={sending || !payload?.mail.ready}
            onClick={() => void sendWeek("current")}
            className="rounded-full border border-[#c4552a] px-4 py-2.5 text-sm font-semibold text-[#c4552a] hover:bg-[#c4552a]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Email this week
          </button>
        </div>
      </header>

      {payload && !payload.mail.ready ? (
        <p className="mt-4 rounded-2xl border border-[#e0d4c3] bg-white/70 px-4 py-3 text-sm text-[#3d4a45]">
          Recording works now. Weekly email starts after{" "}
          <code className="text-[#1c2430]">PRACTICE_MAIL_TO</code> and SMTP or Resend
          settings are added.
        </p>
      ) : null}
      {payload?.mail.ready ? (
        <p className="mt-4 text-sm text-[#5c6b66]">
          Mail goes to {payload.mail.to.join(", ")}
          {payload.lastMail
            ? ` · last sent ${new Date(payload.lastMail.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
            : ""}
          .
        </p>
      ) : null}
      {payload?.ephemeralDisk ? (
        <p className="mt-3 rounded-2xl bg-[#fff4e8] px-4 py-3 text-sm text-[#7a4b12]">
          This host does not keep a permanent disk. Download a copy of the week from
          the summary below if you need a backup outside the email.
        </p>
      ) : null}

      <section id="practice-week" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-practice-display)] text-2xl text-[#1c2430]">
            {payload ? formatWeekRange(payload.weekStart, payload.weekEnd) : "This week"}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadWeek(previousStart)}
              className="rounded-full border border-[#e0d4c3] bg-white px-3 py-1.5 text-sm"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={atThisWeek}
              onClick={() => void loadWeek(payload?.today ?? todayISO())}
              className="rounded-full border border-[#e0d4c3] bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              This week
            </button>
            <button
              type="button"
              disabled={atThisWeek}
              onClick={() => void loadWeek(nextStart)}
              className="rounded-full border border-[#e0d4c3] bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-[#5c6b66]">
          {loading
            ? "Loading records…"
            : `${entries.length} record${entries.length === 1 ? "" : "s"} · ${new Set(entries.map((entry) => entry.name)).size} of ${PRACTICE_NAMES.length} people`}
        </p>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e0d4c3] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[#5c6b66]">
                <th className="sticky left-0 bg-white px-3 py-2 font-medium">Name</th>
                {days.map((day) => (
                  <th key={day} className="px-2 py-2 text-center font-medium">
                    <div>{weekdayShort(day)}</div>
                    <div className="text-xs">{day.slice(8)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRACTICE_NAMES.map((name) => (
                <tr key={name} className="border-t border-[#f0e6d8]">
                  <th className="sticky left-0 bg-white px-3 py-1.5 text-left font-medium text-[#1c2430]">
                    {name}
                  </th>
                  {days.map((day) => {
                    const entry = byKey.get(`${name}|${day}`);
                    const selected = form.name === name && form.date === day;
                    const future = payload ? day > payload.today : false;
                    return (
                      <td key={day} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          disabled={future}
                          onClick={() => openCell(name, day)}
                          aria-label={`${name} on ${formatDay(day)}${entry ? ", recorded" : ""}`}
                          className={`mx-auto flex size-9 items-center justify-center rounded-full text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-30 ${
                            selected
                              ? "bg-[#1c2430] text-white"
                              : entry
                                ? "bg-[#0f6e6b] text-white"
                                : "bg-[#f4efe6] text-[#8a8175] hover:bg-[#e7f3f2]"
                          }`}
                        >
                          {entry ? "✓" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form
        id="practice-form"
        onSubmit={onSave}
        className="mt-10 grid gap-8 rounded-3xl border border-[#e0d4c3] bg-[#fffaf3] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <div className="space-y-7">
          <div>
            <h2 className="font-[family-name:var(--font-practice-display)] text-3xl text-[#1c2430]">
              {form.id ? `Edit ${form.name}` : "New record"}
            </h2>
            <p className="mt-1 text-sm text-[#5c6b66]">
              One record per person per date. Tap a day in the grid, or fill this in.
            </p>
            {errors.form ? <p className="mt-2 text-sm text-[#9a3b22]">{errors.form}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-semibold">
              Date
              <input
                type="date"
                required
                max={payload?.today}
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className={inputClass}
              />
              {errors.date ? <span className="block font-normal text-[#9a3b22]">{errors.date}</span> : null}
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Name
              <select
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className={inputClass}
              >
                <option value="">Choose</option>
                {PRACTICE_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              {errors.name ? <span className="block font-normal text-[#9a3b22]">{errors.name}</span> : null}
            </label>
          </div>

          <Field legend="Meditation" error={errors.meditation}>
            <div className="flex flex-wrap gap-2">
              {MEDITATIONS.map((item) => (
                <Chip
                  key={item}
                  selected={form.meditation.includes(item)}
                  onClick={() => toggleList("meditation", item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Field>

          <Field legend="IRFR & Blue Triangle" error={errors.irfr}>
            <div className="flex flex-wrap gap-2">
              {IRFR_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  selected={form.irfr === item}
                  onClick={() => setForm({ ...form, irfr: form.irfr === item ? null : item })}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Field>

          <Field
            legend="Service"
            hint="Hours for the date above, not for the whole week."
            error={errors.serviceHours}
          >
            <div className="flex flex-wrap gap-2">
              {SERVICE_HOURS.map((item) => (
                <Chip
                  key={item}
                  selected={form.serviceHours === item}
                  onClick={() =>
                    setForm({ ...form, serviceHours: form.serviceHours === item ? null : item })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Field>

          <Field legend="Sex Energy Transmutation" error={errors.sexEnergy || errors.sexEnergyOther}>
            <div className="flex flex-wrap gap-2">
              {SEX_ENERGY_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  selected={form.sexEnergy.includes(item)}
                  onClick={() => toggleList("sexEnergy", item)}
                >
                  {item}
                </Chip>
              ))}
              <Chip
                selected={form.sexEnergyOtherOn}
                onClick={() =>
                  setForm({
                    ...form,
                    sexEnergyOtherOn: !form.sexEnergyOtherOn,
                    sexEnergyOther: form.sexEnergyOtherOn ? "" : form.sexEnergyOther,
                  })
                }
              >
                Other
              </Chip>
            </div>
            {form.sexEnergyOtherOn ? (
              <input
                value={form.sexEnergyOther}
                onChange={(event) => setForm({ ...form, sexEnergyOther: event.target.value })}
                placeholder="Other response"
                className={inputClass}
              />
            ) : null}
          </Field>

          <Field legend="Self Healing" error={errors.selfHealing || errors.selfHealingOther}>
            <div className="flex flex-wrap gap-2">
              {SELF_HEALING_OPTIONS.map((item) => (
                <Chip
                  key={item}
                  selected={form.selfHealing.includes(item)}
                  onClick={() => toggleList("selfHealing", item)}
                >
                  {item}
                </Chip>
              ))}
              <Chip
                selected={form.selfHealingOtherOn}
                onClick={() =>
                  setForm({
                    ...form,
                    selfHealingOtherOn: !form.selfHealingOtherOn,
                    selfHealingOther: form.selfHealingOtherOn ? "" : form.selfHealingOther,
                  })
                }
              >
                Other
              </Chip>
            </div>
            {form.selfHealingOtherOn ? (
              <input
                value={form.selfHealingOther}
                onChange={(event) => setForm({ ...form, selfHealingOther: event.target.value })}
                placeholder="Other response"
                className={inputClass}
              />
            ) : null}
          </Field>

          <Field legend="Arhatic Higher levels" error={errors.higherLevel}>
            <div className="flex flex-wrap gap-2">
              {HIGHER_LEVELS.map((item) => (
                <Chip
                  key={item}
                  selected={form.higherLevel === item}
                  onClick={() =>
                    setForm({ ...form, higherLevel: form.higherLevel === item ? null : item })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Field>

          <ChoiceWithOther
            legend="Understanding Meditation (Arhatic Level 1 & above)"
            options={WEEKLY_ONLY}
            choice={form.understandingChoice}
            other={form.understandingOther}
            error={errors.understanding || errors.understandingOther}
            onChoice={(choice) =>
              setForm({
                ...form,
                understandingChoice: choice,
                understandingOther: choice === "other" ? form.understandingOther : "",
              })
            }
            onOther={(understandingOther) => setForm({ ...form, understandingOther })}
          />

          <ChoiceWithOther
            legend="Concretizing Meditation (Arhatic Level 1 & above)"
            options={WEEKLY_ONLY}
            choice={form.concretizingChoice}
            other={form.concretizingOther}
            error={errors.concretizing || errors.concretizingOther}
            onChoice={(choice) =>
              setForm({
                ...form,
                concretizingChoice: choice,
                concretizingOther: choice === "other" ? form.concretizingOther : "",
              })
            }
            onOther={(concretizingOther) => setForm({ ...form, concretizingOther })}
          />

          <ChoiceWithOther
            legend="Book Reading"
            hint="Choose Hours, or write the book names."
            options={BOOK_READING_OPTIONS}
            choice={form.bookChoice}
            other={form.bookReadingOther}
            otherPlaceholder="Book names"
            error={errors.bookReading || errors.bookReadingOther}
            onChoice={(choice) =>
              setForm({
                ...form,
                bookChoice: choice,
                bookReadingOther: choice === "other" ? form.bookReadingOther : "",
              })
            }
            onOther={(bookReadingOther) => setForm({ ...form, bookReadingOther })}
          />

          <label className="block space-y-2 text-sm font-semibold">
            Any Other Practices
            <textarea
              value={form.otherPractices}
              onChange={(event) => setForm({ ...form, otherPractices: event.target.value })}
              rows={3}
              className={inputClass}
            />
            {errors.otherPractices ? (
              <span className="block font-normal text-[#9a3b22]">{errors.otherPractices}</span>
            ) : null}
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#0f6e6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0c5b59] disabled:opacity-60"
            >
              {saving ? "Saving…" : form.id ? "Update record" : "Save record"}
            </button>
            {form.id ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded-full border border-[#9a3b22] px-5 py-2.5 text-sm font-semibold text-[#9a3b22]"
              >
                Remove
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setErrors({});
                setForm(blankForm(payload?.today ?? todayISO()));
              }}
              className="rounded-full px-4 py-2.5 text-sm text-[#5c6b66]"
            >
              Clear
            </button>
          </div>
        </div>

        <aside className="space-y-3 lg:pt-2">
          <h3 className="text-sm font-semibold tracking-wide text-[#0f6e6b] uppercase">
            Email preview
          </h3>
          <pre className="max-h-[32rem] overflow-auto rounded-2xl bg-[#1c2430] p-4 text-xs leading-relaxed whitespace-pre-wrap text-[#f4efe6]">
            {summary?.text || "The week’s email will appear here."}
          </pre>
        </aside>
      </form>
    </main>
  );
}

function ChoiceWithOther({
  legend,
  hint,
  options,
  choice,
  other,
  otherPlaceholder = "Other response",
  error,
  onChoice,
  onOther,
}: {
  legend: string;
  hint?: string;
  options: readonly string[];
  choice: string | null;
  other: string;
  otherPlaceholder?: string;
  error?: string;
  onChoice: (choice: string | null) => void;
  onOther: (value: string) => void;
}) {
  return (
    <Field legend={legend} hint={hint} error={error}>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => (
          <Chip key={item} selected={choice === item} onClick={() => onChoice(choice === item ? null : item)}>
            {item}
          </Chip>
        ))}
        <Chip selected={choice === "other"} onClick={() => onChoice(choice === "other" ? null : "other")}>
          Other
        </Chip>
      </div>
      {choice === "other" ? (
        <input
          value={other}
          onChange={(event) => onOther(event.target.value)}
          placeholder={otherPlaceholder}
          className={inputClass}
        />
      ) : null}
    </Field>
  );
}
