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
} from "./catalog";
import { addDays, isISODate, todayISO } from "./dates";
import type { PracticeDraft, PracticeEntry } from "./types";

const OTHER_MAX = 300;
const NOTE_MAX = 1000;

export type FieldErrors = Partial<Record<string, string>>;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function subset(values: string[], allowed: readonly string[]): boolean {
  const ok = new Set<string>(allowed);
  return values.every((value) => ok.has(value));
}

function oneOf(value: string | null, allowed: readonly string[]): boolean {
  return value === null || allowed.includes(value);
}

export function emptyDraft(date = todayISO()): PracticeDraft {
  return {
    date,
    name: "",
    meditation: [],
    irfr: null,
    serviceHours: null,
    sexEnergy: [],
    sexEnergyOther: "",
    selfHealing: [],
    selfHealingOther: "",
    higherLevel: null,
    understanding: null,
    understandingOther: "",
    concretizing: null,
    concretizingOther: "",
    bookReading: null,
    bookReadingOther: "",
    otherPractices: "",
  };
}

export function draftFromEntry(entry: PracticeEntry): PracticeDraft {
  const { id, createdAt, updatedAt, ...draft } = entry;
  void createdAt;
  void updatedAt;
  return { ...draft, id };
}

export function validateDraft(
  input: unknown,
  now = new Date(),
): { ok: true; draft: PracticeDraft } | { ok: false; error: string; fields: FieldErrors } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "The record could not be read.", fields: {} };
  }
  const body = input as Record<string, unknown>;
  const fields: FieldErrors = {};

  const date = asString(body.date);
  const name = asString(body.name);
  if (!isISODate(date)) fields.date = "Choose a valid date.";
  else if (date > todayISO(now)) fields.date = "The date cannot be in the future.";
  else if (date < addDays(todayISO(now), -366 * 2)) {
    fields.date = "Choose a date from the last two years.";
  }

  if (!PRACTICE_NAMES.includes(name as (typeof PRACTICE_NAMES)[number])) {
    fields.name = "Choose a name from the list.";
  }

  const meditation = asStringList(body.meditation);
  const sexEnergy = asStringList(body.sexEnergy);
  const selfHealing = asStringList(body.selfHealing);
  if (!meditation || !subset(meditation, MEDITATIONS)) {
    fields.meditation = "Choose meditations from the list.";
  }
  if (!sexEnergy || !subset(sexEnergy, SEX_ENERGY_OPTIONS)) {
    fields.sexEnergy = "Choose Daily, Weekly, or both.";
  }
  if (!selfHealing || !subset(selfHealing, SELF_HEALING_OPTIONS)) {
    fields.selfHealing = "Choose self-healing practices from the list.";
  }

  const irfr = body.irfr == null || body.irfr === "" ? null : asString(body.irfr);
  const serviceHours =
    body.serviceHours == null || body.serviceHours === ""
      ? null
      : asString(body.serviceHours);
  const higherLevel =
    body.higherLevel == null || body.higherLevel === ""
      ? null
      : asString(body.higherLevel);
  const understanding =
    body.understanding == null || body.understanding === ""
      ? null
      : asString(body.understanding);
  const concretizing =
    body.concretizing == null || body.concretizing === ""
      ? null
      : asString(body.concretizing);
  const bookReading =
    body.bookReading == null || body.bookReading === ""
      ? null
      : asString(body.bookReading);

  if (!oneOf(irfr, IRFR_OPTIONS)) fields.irfr = "Choose one IRFR virtue.";
  if (!oneOf(serviceHours, SERVICE_HOURS)) fields.serviceHours = "Choose service hours.";
  if (!oneOf(higherLevel, HIGHER_LEVELS)) fields.higherLevel = "Choose one level.";
  if (understanding !== null && understanding !== "other" && !oneOf(understanding, WEEKLY_ONLY)) {
    fields.understanding = "Choose Weekly or write your own note.";
  }
  if (concretizing !== null && concretizing !== "other" && !oneOf(concretizing, WEEKLY_ONLY)) {
    fields.concretizing = "Choose Weekly or write your own note.";
  }
  if (
    bookReading !== null &&
    bookReading !== "other" &&
    !oneOf(bookReading, BOOK_READING_OPTIONS)
  ) {
    fields.bookReading = "Choose Hours or write the book names.";
  }

  const sexEnergyOther = asString(body.sexEnergyOther);
  const selfHealingOther = asString(body.selfHealingOther);
  const understandingOther = asString(body.understandingOther);
  const concretizingOther = asString(body.concretizingOther);
  const bookReadingOther = asString(body.bookReadingOther);
  const otherPractices = asString(body.otherPractices);
  const sexEnergyOtherOn = body.sexEnergyOtherOn === true;
  const selfHealingOtherOn = body.selfHealingOtherOn === true;

  if (sexEnergyOther.length > OTHER_MAX) fields.sexEnergyOther = "Keep this under 300 characters.";
  if (selfHealingOther.length > OTHER_MAX) {
    fields.selfHealingOther = "Keep this under 300 characters.";
  }
  if (understandingOther.length > OTHER_MAX) {
    fields.understandingOther = "Keep this under 300 characters.";
  }
  if (concretizingOther.length > OTHER_MAX) {
    fields.concretizingOther = "Keep this under 300 characters.";
  }
  if (bookReadingOther.length > OTHER_MAX) {
    fields.bookReadingOther = "Keep this under 300 characters.";
  }
  if (otherPractices.length > NOTE_MAX) {
    fields.otherPractices = "Keep this under 1000 characters.";
  }

  if (sexEnergyOtherOn && !sexEnergyOther) {
    fields.sexEnergyOther = "Write the other response, or turn Other off.";
  }
  if (selfHealingOtherOn && !selfHealingOther) {
    fields.selfHealingOther = "Write the other response, or turn Other off.";
  }
  if (understanding === "other" && !understandingOther) {
    fields.understandingOther = "Write what you practiced, or clear Other.";
  }
  if (concretizing === "other" && !concretizingOther) {
    fields.concretizingOther = "Write what you practiced, or clear Other.";
  }
  if (bookReading === "other" && !bookReadingOther) {
    fields.bookReadingOther = "Write the book names, or clear Other.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Check the highlighted fields.", fields };
  }

  const draft: PracticeDraft = {
    id: asString(body.id) || undefined,
    date,
    name,
    meditation: meditation ?? [],
    irfr,
    serviceHours,
    sexEnergy: sexEnergy ?? [],
    sexEnergyOther: sexEnergyOtherOn ? sexEnergyOther : "",
    selfHealing: selfHealing ?? [],
    selfHealingOther: selfHealingOtherOn ? selfHealingOther : "",
    higherLevel,
    understanding: understanding === "other" ? null : understanding,
    understandingOther: understanding === "other" ? understandingOther : "",
    concretizing: concretizing === "other" ? null : concretizing,
    concretizingOther: concretizing === "other" ? concretizingOther : "",
    bookReading: bookReading === "other" ? null : bookReading,
    bookReadingOther: bookReading === "other" ? bookReadingOther : "",
    otherPractices,
  };

  const hasPractice =
    draft.meditation.length > 0 ||
    draft.irfr ||
    draft.serviceHours ||
    draft.sexEnergy.length > 0 ||
    draft.sexEnergyOther ||
    draft.selfHealing.length > 0 ||
    draft.selfHealingOther ||
    draft.higherLevel ||
    draft.understanding ||
    draft.understandingOther ||
    draft.concretizing ||
    draft.concretizingOther ||
    draft.bookReading ||
    draft.bookReadingOther ||
    draft.otherPractices;

  if (!hasPractice) {
    return {
      ok: false,
      error: "Add at least one practice for this day.",
      fields: { form: "Add at least one practice for this day." },
    };
  }

  return { ok: true, draft };
}
