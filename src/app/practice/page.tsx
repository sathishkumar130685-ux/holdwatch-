import { PracticeApp } from "@/components/practice/practice-app";
import { hasPracticeAccess, practiceAccessCode } from "@/lib/practices/access";
import { loadWeekView } from "@/lib/practices/week-view";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const accessRequired = Boolean(practiceAccessCode());
  const unlocked = await hasPracticeAccess();
  const initialWeek = unlocked ? await loadWeekView() : null;
  return (
    <PracticeApp
      initialUnlocked={unlocked}
      accessRequired={accessRequired}
      initialWeek={initialWeek}
    />
  );
}
