export type PracticeEntry = {
  id: string;
  date: string;
  name: string;
  meditation: string[];
  irfr: string | null;
  serviceHours: string | null;
  sexEnergy: string[];
  sexEnergyOther: string;
  selfHealing: string[];
  selfHealingOther: string;
  higherLevel: string | null;
  understanding: string | null;
  understandingOther: string;
  concretizing: string | null;
  concretizingOther: string;
  bookReading: string | null;
  bookReadingOther: string;
  otherPractices: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeDraft = Omit<PracticeEntry, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type WeekScope = "current" | "previous";

export type WeekView = {
  entries: PracticeEntry[];
  weekStart: string;
  weekEnd: string;
  today: string;
  mail: { ready: boolean; to: string[]; via: "resend" | "smtp" | null };
  lastMail: { weekStart: string; sentAt: string; scope: string } | null;
  ephemeralDisk: boolean;
};
