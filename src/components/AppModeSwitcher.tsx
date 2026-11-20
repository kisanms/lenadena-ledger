import { useNavigate } from "@tanstack/react-router";
import { BookOpen, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppModeSwitcherProps {
  current: "khata" | "counter";
  className?: string;
}

export function AppModeSwitcher({ current, className }: AppModeSwitcherProps) {
  const navigate = useNavigate();

  const switchMode = (mode: "khata" | "counter", e: React.MouseEvent<HTMLButtonElement>) => {
    if (mode === current) return;

    // Calculate exact tap coordinates for the smooth circular ripple animation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((rect.left + rect.width / 2) / window.innerWidth) * 100);
    const y = Math.round(((rect.top + rect.height / 2) / window.innerHeight) * 100);

    if (mode === "khata") {
      sessionStorage.setItem("ld_khata_origin", `${x}%,${y}%`);
      sessionStorage.setItem("ld_animate_khata", "true");
      navigate({ to: "/", replace: true });
    } else {
      sessionStorage.setItem("ld_pos_origin", `${x}%,${y}%`);
      navigate({ to: "/counter", replace: true });
    }
  };

  return (
    <div
      className={cn(
        "flex items-center p-1 rounded-2xl bg-black/15 backdrop-blur-md border border-white/10 gap-1.5 shadow-inner select-none",
        className,
      )}
      role="tablist"
      aria-label="App mode switcher"
    >
      {/* LenaDena Khata Tab */}
      <button
        onClick={(e) => switchMode("khata", e)}
        role="tab"
        aria-selected={current === "khata"}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98]",
          current === "khata"
            ? "bg-white text-emerald-950 shadow-md font-extrabold"
            : "text-white/80 hover:text-white hover:bg-white/10",
        )}
      >
        <div
          className={cn(
            "grid place-items-center h-6 w-6 rounded-lg transition-colors",
            current === "khata" ? "bg-emerald-100 text-emerald-800" : "bg-white/15 text-white",
          )}
        >
          <BookOpen className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col items-start text-left leading-none">
          <span className="text-[13px] tracking-tight">LenaDena</span>
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wider mt-0.5",
              current === "khata" ? "text-emerald-700/80" : "text-white/60",
            )}
          >
            Khata
          </span>
        </div>
      </button>

      {/* LenaDena POS Tab */}
      <button
        onClick={(e) => switchMode("counter", e)}
        role="tab"
        aria-selected={current === "counter"}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] relative",
          current === "counter"
            ? "bg-white text-blue-950 shadow-md font-extrabold"
            : "text-white/80 hover:text-white hover:bg-white/10",
        )}
      >
        <div
          className={cn(
            "grid place-items-center h-6 w-6 rounded-lg transition-colors",
            current === "counter" ? "bg-blue-600 text-white shadow-sm" : "bg-white/15 text-white",
          )}
        >
          <QrCode className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col items-start text-left leading-none">
          <div className="flex items-center gap-1">
            <span className="text-[13px] tracking-tight">LenaDena POS</span>
          </div>
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-wider mt-0.5",
              current === "counter" ? "text-blue-700/80" : "text-white/60",
            )}
          >
            Instant QR
          </span>
        </div>
      </button>
    </div>
  );
}
