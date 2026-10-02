import { BookOpen } from "lucide-react";

export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid place-items-center rounded-2xl bg-primary text-primary-foreground ${big ? "h-12 w-12" : "h-9 w-9"}`}
      >
        <BookOpen className={big ? "h-6 w-6" : "h-5 w-5"} />
      </span>
      <span className={`font-display font-bold tracking-tight ${big ? "text-3xl" : "text-xl"}`}>
        Lena<span className="text-accent">Dena</span>
      </span>
    </div>
  );
}
