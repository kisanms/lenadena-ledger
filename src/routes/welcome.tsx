import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpenCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ONBOARD_KEY } from "@/components/AppGate";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome to LenaDena — Digital Khata" },
      { name: "description", content: "Track udhaar, payments and balances for customers and suppliers." },
      { property: "og:title", content: "Welcome to LenaDena" },
      { property: "og:description", content: "Your shop's digital khata book — free, secure, synced." },
    ],
  }),
  component: Welcome,
});

const slides = [
  { icon: BookOpenCheck, title: "Your khata, digital", body: "Record every lena and dena for customers and suppliers. Balances update automatically — even partial payments." },
  { icon: MessageCircle, title: "Remind on WhatsApp", body: "Send a clean receipt and balance reminder in one tap after every entry." },
  { icon: ShieldCheck, title: "Safe & synced", body: "Locked with your PIN or fingerprint. Backed up in the cloud and synced across devices." },
];

function Welcome() {
  const [i, setI] = useState(0);
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const navigate = useNavigate();
  const { lang, setLang, languages } = useI18n();
  const S = slides[i]!;
  const continueToLogin = () => {
    localStorage.setItem(ONBOARD_KEY, "1");
    navigate({ to: "/login" });
  };
  const startLanguageSelection = () => setChoosingLanguage(true);

  if (choosingLanguage) {
    const languageNames: Record<string, string> = {
      en: "English",
      hi: "हिन्दी · Hindi",
      hinglish: "Hinglish",
      gu: "ગુજરાતી · Gujarati",
      mr: "मराठी · Marathi",
    };
    return (
      <div className="min-h-dvh flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <button className="text-sm text-muted-foreground" onClick={continueToLogin}>Skip</button>
        </div>
        <div className="flex-1 flex flex-col justify-center gap-6 py-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">Choose your language</h1>
            <p className="text-muted-foreground">You can change this anytime in Settings.</p>
          </div>
          <div className="grid gap-3" role="radiogroup" aria-label="Choose your language">
            {languages.map((language) => (
              <button
                key={language.code}
                type="button"
                role="radio"
                aria-checked={lang === language.code}
                onClick={() => setLang(language.code)}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-medium transition-colors",
                  lang === language.code ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <span>{languageNames[language.code] ?? language.nativeLabel}</span>
                <span className={cn("grid h-5 w-5 place-items-center rounded-full border", lang === language.code ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                  {lang === language.code && <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Button className="h-14 text-base" onClick={continueToLogin}>Continue</Button>
      </div>
    );
  }
  return (
    <div className="min-h-dvh flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <Logo size="sm" />
        <button className="text-sm text-muted-foreground" onClick={startLanguageSelection}>Skip</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 py-6">
        <div className="grid place-items-center h-32 w-32 sm:h-40 sm:w-40 rounded-[2rem] shrink-0 bg-secondary">
          <S.icon className="h-16 w-16 text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{S.title}</h1>
        <p className="text-muted-foreground text-base sm:text-lg">{S.body}</p>
      </div>
      <div className="flex justify-center gap-2 mb-6">
        {slides.map((_, k) => (
          <span key={k} className={cn("h-2 rounded-full transition-all", k === i ? "w-8 bg-primary" : "w-2 bg-border")} />
        ))}
      </div>
      <Button className="h-14 text-base" onClick={() => (i < slides.length - 1 ? setI(i + 1) : startLanguageSelection())}>
        {i < slides.length - 1 ? "Next" : "Get started"}
      </Button>
    </div>
  );
}
