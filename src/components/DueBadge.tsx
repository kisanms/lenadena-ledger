import { daysUntil, fmtDue } from "@/lib/ledger";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Shows localized "Overdue by X days" / "Due in X days" with high contrast in light & dark mode. */
export function DueBadge({
  due,
  balance,
  className,
}: {
  due?: string | null | undefined;
  balance: number;
  className?: string | undefined;
}) {
  const { t, lang } = useI18n();

  if (!due || balance <= 0) return null;
  const n = daysUntil(due);
  const late = n < 0;

  const dateStr = fmtDue(due);
  let text = "";

  if (late) {
    const days = -n;
    if (lang === "gu") text = `${days} દિવસ મોડું · ${dateStr}`;
    else if (lang === "hi") text = `${days} दिन लेट · ${dateStr}`;
    else if (lang === "mr") text = `${days} दिवस उशीर · ${dateStr}`;
    else if (lang === "hinglish") text = `${days} din overdue · ${dateStr}`;
    else text = `Overdue ${days} day${days === 1 ? "" : "s"} · due ${dateStr}`;
  } else if (n === 0) {
    text = t("due_today", "Due today");
  } else {
    if (lang === "gu") text = `${n} દિવસમાં બાકી · ${dateStr}`;
    else if (lang === "hi") text = `${n} दिन में बाकी · ${dateStr}`;
    else if (lang === "mr") text = `${n} दिवसांत देय · ${dateStr}`;
    else if (lang === "hinglish") text = `${n} din me due · ${dateStr}`;
    else text = `Due in ${n} day${n === 1 ? "" : "s"} · ${dateStr}`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        late || n === 0
          ? "bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-red-400 border border-destructive/20"
          : "bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-500/25 dark:border-amber-400/30",
        className,
      )}
    >
      {late ? "🔴 " : "⏱ "}
      {text}
    </span>
  );
}
