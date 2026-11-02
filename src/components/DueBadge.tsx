import { daysUntil, fmtDue } from "@/lib/ledger";
import { cn } from "@/lib/utils";

/** Shows "Overdue by X days" / "Due in X days" for a party that still owes money. */
export function DueBadge({ due, balance, className }: { due?: string | null | undefined; balance: number; className?: string | undefined }) {
  if (!due || balance <= 0) return null;
  const n = daysUntil(due);
  const late = n < 0;
  const text = late
    ? `Overdue ${-n} day${n === -1 ? "" : "s"} · due ${fmtDue(due)}`
    : n === 0
      ? `Due today`
      : `Due in ${n} day${n === 1 ? "" : "s"} · ${fmtDue(due)}`;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        late || n === 0 ? "bg-destructive/15 text-destructive" : "bg-accent/20 text-accent-foreground",
        className,
      )}
    >
      {late ? "🔴 " : "⏱ "}
      {text}
    </span>
  );
}
