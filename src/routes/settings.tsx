import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { PinDots, PinPad } from "@/components/PinPad";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RecoveryPinRow } from "@/components/RecoveryPinRow";
import { InstallBanner } from "@/components/InstallBanner";
import { useProfile } from "@/lib/ledger";
import {
  biometricSupported, clearLock, disableBiometric, hasBiometric, hasPin, registerBiometric, setPin,
} from "@/lib/lock";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LenaDena" },
      { name: "description", content: "Business profile, PIN lock and biometrics." },
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
  const [biz, setBiz] = useState("");
  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [pinOn, setPinOn] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioOk, setBioOk] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);

  useEffect(() => {
    setPinOn(hasPin());
    setBioOn(hasBiometric());
    void biometricSupported().then(setBioOk);
  }, []);
  useEffect(() => {
    if (profile) {
      setBiz(profile.business_name ?? "");
      setOwner(profile.owner_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const saveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: uid, business_name: biz.trim() || null, owner_name: owner.trim() || null, phone: phone.trim() || null });
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile", uid] });
    toast.success("Profile saved");
  };

  const toggleBio = async (on: boolean) => {
    try {
      if (on) {
        await registerBiometric(session!.user.email ?? "user");
        toast.success("Biometric unlock enabled");
      } else disableBiometric();
      setBioOn(on);
    } catch {
      toast.error("Couldn't set up biometrics");
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto pb-10">
      <header className="flex items-center gap-3 px-4 py-5">
        <Link to="/" className="grid place-items-center h-10 w-10 rounded-full bg-secondary" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="mx-4 rounded-2xl bg-card border p-4 space-y-4">
        <h2 className="font-semibold">Business profile</h2>
        <div className="space-y-1.5"><Label htmlFor="biz">Business name</Label><Input id="biz" className="h-12" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="Sharma General Store" /></div>
        <div className="space-y-1.5"><Label htmlFor="own">Owner name</Label><Input id="own" className="h-12" value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="ph">Phone</Label><Input id="ph" className="h-12" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button className="w-full h-12" onClick={saveProfile}>Save profile</Button>
      </section>

      <section className="mx-4 mt-4 rounded-2xl bg-card border divide-y">
        <div className="flex items-center gap-3 p-4">
          <KeyRound className="h-5 w-5 text-primary" />
          <div className="flex-1"><p className="font-medium">4-digit PIN lock</p><p className="text-xs text-muted-foreground">Asked each time the app opens</p></div>
          <Switch
            checked={pinOn}
            onCheckedChange={(on) => {
              if (on) setPinSheet(true);
              else { clearLock(); setPinOn(false); setBioOn(false); toast.success("PIN removed"); }
            }}
          />
        </div>
        {pinOn && (
          <button className="w-full text-left p-4 text-sm text-primary font-medium" onClick={() => setPinSheet(true)}>Change PIN</button>
        )}
        <div className="flex items-center gap-3 p-4">
          <Fingerprint className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">Fingerprint / Face unlock</p>
            <p className="text-xs text-muted-foreground">{!bioOk ? "Not available on this device" : !pinOn ? "Set a PIN first" : "Faster unlock, PIN as backup"}</p>
          </div>
          <Switch checked={bioOn} disabled={!bioOk || !pinOn} onCheckedChange={toggleBio} />
        </div>
      </section>

      <RecoveryPinRow />

      <div className="mx-4 mt-4"><InstallBanner always /></div>

      <section className="mx-4 mt-4 rounded-2xl bg-card border p-4">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="font-medium">{session?.user.email}</p>
        <Button variant="outline" className="w-full h-12 mt-4 text-destructive" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </section>

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
