import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, LogOut, Share2, Info, Trash2, Languages as LanguagesIcon, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PinDots, PinPad } from "@/components/PinPad";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RecoveryPinRow } from "@/components/RecoveryPinRow";
import { InstallBanner } from "@/components/InstallBanner";
import { useProfile } from "@/lib/ledger";
import { clearLock, hasPin, setPin } from "@/lib/lock";
import { useI18n, languages, type LangCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LenaDena" },
      { name: "description", content: "Business profile and PIN lock." },
      { property: "og:title", content: "Settings — LenaDena" },
      { property: "og:description", content: "Manage your LenaDena business profile and security." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session, signOut } = useAuth();
  const uid = session!.user.id;
  const { data: profile } = useProfile(uid);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/", replace: true });
    }
  };
  const [biz, setBiz] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [pinOn, setPinOn] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [langSheet, setLangSheet] = useState(false);

  useEffect(() => {
    setPinOn(hasPin());
  }, []);

  useEffect(() => {
    if (profile) {
      setBiz(profile.business_name ?? "");
      setOwner(profile.owner_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const activeLangObj = languages.find((l) => l.code === lang) || languages[0]!;

  const saveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, business_name: biz.trim() || null, owner_name: owner.trim() || null, phone: phone.trim() || null });
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile", uid] });
    toast.success(t("save_profile"));
  };

  const handleShareApp = async () => {
    const shareUrl = "https://lenadena-one-stop-solution.vercel.app/apk";
    const shareText = `📲 Download the app:\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "LenaDena — Digital Khata",
          text: "📲 Download the app:",
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") {
          return;
        }
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast.success("APK download link copied to clipboard!");
      } else {
        const input = document.createElement("textarea");
        input.value = shareText;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast.success("APK download link copied to clipboard!");
      }
    } catch {
      toast.error("Could not share or copy link");
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto pb-10">
      <header className="flex items-center gap-3 px-4 py-5">
        <button
          type="button"
          onClick={handleBack}
          className="grid place-items-center h-10 w-10 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition"
          aria-label={t("back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold flex-1">{t("settings")}</h1>

        {/* Top-Right '?' Help & Options Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid place-items-center h-10 w-10 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-bold text-lg transition"
              aria-label="Help and Options"
            >
              ?
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1 shadow-lg">
            <DropdownMenuItem
              onClick={() => navigate({ to: "/about" })}
              className="cursor-pointer gap-2.5 py-2.5 px-3 rounded-lg text-sm font-medium"
            >
              <Info className="h-4 w-4 text-primary" />
              <span>{t("about_this_app")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => navigate({ to: "/delete-account" })}
              className="cursor-pointer gap-2.5 py-2.5 px-3 rounded-lg text-sm font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              <span>{t("delete_account")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* App Language Section */}
      <section className="mx-4 mb-4 rounded-2xl bg-card border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <LanguagesIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t("app_language")}</p>
            <p className="text-xs text-muted-foreground">{t("app_language_desc")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLangSheet(true)}
            className="font-semibold rounded-xl h-9 px-3 border-primary/30 text-primary hover:bg-primary/5"
          >
            {activeLangObj.nativeLabel}
          </Button>
        </div>
      </section>

      <section className="mx-4 rounded-2xl bg-card border p-4 space-y-4">
        <h2 className="font-semibold">{t("business_profile")}</h2>
        <div className="space-y-1.5"><Label htmlFor="biz">{t("business_name")}</Label><Input id="biz" className="h-12" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Sharma General Store" /></div>
        <div className="space-y-1.5"><Label htmlFor="own">{t("owner_name")}</Label><Input id="own" className="h-12" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="ph">{t("phone_number")}</Label><Input id="ph" className="h-12" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button className="w-full h-12" onClick={saveProfile}>{t("save_profile")}</Button>
      </section>

      <section className="mx-4 mt-4 rounded-2xl bg-card border divide-y">
        <div className="flex items-center gap-3 p-4">
          <KeyRound className="h-5 w-5 text-primary" />
          <div className="flex-1"><p className="font-medium">{t("pin_lock")}</p><p className="text-xs text-muted-foreground">{t("pin_lock_hint")}</p></div>
          <Switch
            checked={pinOn}
            onCheckedChange={(on) => {
              if (on) setPinSheet(true);
              else { clearLock(); setPinOn(false); toast.success("PIN removed"); }
            }}
          />
        </div>
        {pinOn && (
          <button className="w-full text-left p-4 text-sm text-primary font-medium" onClick={() => setPinSheet(true)}>{t("change_pin")}</button>
        )}
      </section>

      <RecoveryPinRow />
      <PushRow />

      <section className="mx-4 mt-4 rounded-2xl bg-card border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <Share2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{t("share_app")}</p>
            <p className="text-xs text-muted-foreground">
              {t("share_app_hint")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full h-11 font-medium gap-2"
          onClick={handleShareApp}
        >
          <Share2 className="h-4 w-4" />
          {t("share_app_btn")}
        </Button>
      </section>

      <div className="mx-4 mt-4"><InstallBanner always /></div>

      <section className="mx-4 mt-4 rounded-2xl bg-card border p-4">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="font-medium">{session?.user.email}</p>
        <Button variant="outline" className="w-full h-12 mt-4 text-destructive" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> {t("sign_out")}
        </Button>
      </section>

      {/* Language Selection Drawer */}
      <Drawer open={langSheet} onOpenChange={setLangSheet}>
        <DrawerContent className="max-w-md mx-auto p-4 space-y-4">
          <DrawerHeader className="p-0 text-left">
            <DrawerTitle className="text-lg font-bold flex items-center gap-2">
              <LanguagesIcon className="h-5 w-5 text-primary" />
              <span>{t("app_language")}</span>
            </DrawerTitle>
            <p className="text-xs text-muted-foreground">{t("app_language_desc")}</p>
          </DrawerHeader>
          <div className="space-y-1.5 py-2">
            {languages.map((l) => {
              const isSelected = l.code === lang;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    setLangSheet(false);
                    toast.success(`${l.nativeLabel} selected`);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3.5 rounded-xl transition text-left border",
                    isSelected
                      ? "border-primary bg-primary/5 font-semibold text-primary"
                      : "border-border hover:bg-secondary/60 text-foreground"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{l.nativeLabel}</span>
                    <span className="text-xs text-muted-foreground">{l.label}</span>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <SetPinSheet open={pinSheet} onOpenChange={setPinSheet} uid={uid} onDone={() => setPinOn(true)} />
    </div>
  );
}

function SetPinSheet({ open, onOpenChange, uid, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; uid: string; onDone: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPinVal] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => { if (open) { setFirst(null); setPinVal(""); setErr(false); } }, [open]);

  const press = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPinVal(next);
    setErr(false);
    if (next.length < 4) return;
    if (!first) { setTimeout(() => { setFirst(next); setPinVal(""); }, 150); return; }
    if (first === next) {
      await setPin(next, uid);
      toast.success("PIN set");
      onDone();
      onOpenChange(false);
    } else {
      setErr(true);
      setTimeout(() => { setFirst(null); setPinVal(""); }, 400);
      toast.error("PINs didn't match, try again");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8 space-y-6">
          <DrawerHeader className="px-0 text-center">
            <DrawerTitle className="font-display text-2xl">{first ? "Confirm PIN" : "Create a 4-digit PIN"}</DrawerTitle>
          </DrawerHeader>
          <PinDots value={pin} error={err} />
          <PinPad onDigit={press} onDelete={() => setPinVal((p) => p.slice(0, -1))} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
