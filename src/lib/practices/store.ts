import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { weekDates } from "./dates";
import type { PracticeDraft, PracticeEntry } from "./types";

type MailLog = {
  weekStart: string;
  sentAt: string;
  scope: string;
};

type StoreFile = {
  entries: PracticeEntry[];
  lastMail?: MailLog;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "practices.json");

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      lastMail: parsed.lastMail,
    };
  } catch {
    return { entries: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function listEntries(): Promise<PracticeEntry[]> {
  const store = await readStore();
  return [...store.entries].sort(
    (a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name),
  );
}

export async function listEntriesForWeek(weekStart: string): Promise<PracticeEntry[]> {
  const dates = new Set(weekDates(weekStart));
  const entries = await listEntries();
  return entries.filter((entry) => dates.has(entry.date));
}

export async function getMailLog(): Promise<MailLog | null> {
  const store = await readStore();
  return store.lastMail ?? null;
}

export async function saveEntry(
  draft: PracticeDraft,
): Promise<{ ok: true; entry: PracticeEntry } | { ok: false; error: string; status: number }> {
  return withLock(async () => {
    const store = await readStore();
    const now = new Date().toISOString();
    const duplicate = store.entries.find(
      (entry) => entry.name === draft.name && entry.date === draft.date && entry.id !== draft.id,
    );
    if (duplicate) {
      return {
        ok: false,
        status: 409,
        error: `${draft.name} already has a record for this date. Open that record to change it.`,
      };
    }

    if (draft.id) {
      const index = store.entries.findIndex((entry) => entry.id === draft.id);
      if (index === -1) {
        return { ok: false, status: 404, error: "That record is no longer here." };
      }
      const entry: PracticeEntry = {
        ...draft,
        id: draft.id,
        createdAt: store.entries[index].createdAt,
        updatedAt: now,
      };
      store.entries[index] = entry;
      await writeStore(store);
      return { ok: true, entry };
    }

    const entry: PracticeEntry = {
      ...draft,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    store.entries.push(entry);
    await writeStore(store);
    return { ok: true, entry };
  });
}

export async function deleteEntry(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withLock(async () => {
    const store = await readStore();
    const next = store.entries.filter((entry) => entry.id !== id);
    if (next.length === store.entries.length) {
      return { ok: false, error: "That record is no longer here." };
    }
    store.entries = next;
    await writeStore(store);
    return { ok: true };
  });
}

export async function markMailSent(weekStart: string, scope: string): Promise<void> {
  await withLock(async () => {
    const store = await readStore();
    store.lastMail = { weekStart, sentAt: new Date().toISOString(), scope };
    await writeStore(store);
  });
}
