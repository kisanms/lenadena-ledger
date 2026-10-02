import { Delete, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";

export function PinDots({ value, error }: { value: string; error?: boolean }) {
  return (
    <div className={cn("flex justify-center gap-4", error && "animate-[shake_0.3s]")}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "h-4 w-4 rounded-full border-2 border-primary transition-colors",
            value.length > i && "bg-primary",
            error && "border-destructive bg-destructive",
          )}
        />
      ))}
    </div>
  );
}

export function PinPad({
  onDigit,
  onDelete,
  onBio,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onBio?: (() => void) | undefined;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const btn = "h-16 rounded-2xl text-2xl font-semibold bg-card active:bg-secondary transition-colors";
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-xs mx-auto">
      {keys.map((k) => (
        <button key={k} className={btn} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      {onBio ? (
        <button className={cn(btn, "flex items-center justify-center text-primary")} onClick={onBio} aria-label="Use biometrics">
          <Fingerprint className="h-7 w-7" />
        </button>
      ) : (
        <span />
      )}
      <button className={btn} onClick={() => onDigit("0")}>0</button>
      <button className={cn(btn, "flex items-center justify-center")} onClick={onDelete} aria-label="Delete">
        <Delete className="h-6 w-6" />
      </button>
    </div>
  );
}
