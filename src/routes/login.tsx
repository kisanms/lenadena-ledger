import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { phoneTaken, resetWithRecoveryPin, setRecoveryPin, signInWithPhone } from "@/lib/auth-rpc";
import { normalizePhone } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LenaDena" },
      { name: "description", content: "Sign in or create your LenaDena digital khata with mobile number or email and password." },
      { property: "og:title", content: "Sign in — LenaDena" },
      { property: "og:description", content: "Access your shop ledger securely." },
    ],
  }),
  component: Login,
});

const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s);
const isPhone = (s: string) => normalizePhone(s).length >= 10;

function Login() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [rpin, setRpin] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    const v = id.trim();
    if (!pw) return void toast.error("Enter your password");
    setBusy(true);
    try {
      if (isEmail(v)) {
        const { error } = await supabase.auth.signInWithPassword({ email: v.toLowerCase(), password: pw });
        if (error) toast.error("Wrong email or password");
      } else if (isPhone(v)) {
        const norm = normalizePhone(v);
        const r = await signInWithPhone(norm, pw);
        if (!r.ok) toast.error(r.error);
      } else toast.error("Enter a valid mobile number or email");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    const normPhone = normalizePhone(phone);
    if (!name.trim()) return void toast.error("Enter your name or shop name");
    if (normPhone.length < 10) return void toast.error("Enter a valid 10-digit mobile number");
    if (!isEmail(email)) return void toast.error("Enter a valid email");
    if (pw.length < 6) return void toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return void toast.error("Passwords don't match");
    if (!/^\d{4}$/.test(rpin)) return void toast.error("Set a 4-digit recovery PIN");
    setBusy(true);
    try {
      const taken = await phoneTaken(normPhone);
      if (taken) return void toast.error("This mobile number is already registered");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pw,
        options: {
          emailRedirectTo: window.location.origin,
          data: { phone: normPhone, owner_name: name.trim(), business_name: name.trim() },
        },
      });
      if (error) return void toast.error(error.message);
      if (data.session) {
        const r = await setRecoveryPin(rpin).catch(() => ({ ok: false as const }));
        if (!r.ok) toast.error("Couldn't save recovery PIN — set it in Settings");
      }
      if (!data.session) toast.success("Account created. Please sign in.");
      else toast.success("Welcome to LenaDena!");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const v = id.trim();
    if (!isEmail(v) && !isPhone(v)) return void toast.error("Enter your mobile number or email");
    const target = isEmail(v) ? v : normalizePhone(v);
    if (!/^\d{4}$/.test(rpin)) return void toast.error("Enter your 4-digit recovery PIN");
    if (pw.length < 6) return void toast.error("New password must be at least 6 characters");
    if (pw !== pw2) return void toast.error("Passwords don't match");
    setBusy(true);
    try {
      const r = await resetWithRecoveryPin(target, rpin, pw);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Password changed!");
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: pw });
      if (error) { setMode("in"); setPw2(""); setRpin(""); }
    } finally {
      setBusy(false);
    }
  };

  const pinInput = (label: string) => (
    <Field label={label}>
      <Input className="h-12 text-base tracking-[0.5em]" type="password" inputMode="numeric" maxLength={4} value={rpin}
        onChange={(e) => setRpin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="••••" autoComplete="off" />
    </Field>
  );

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="space-y-3">
          <Logo />
          <h1 className="text-3xl font-extrabold tracking-tight">Namaste! Let's open your khata.</h1>
          <p className="text-muted-foreground">You'll stay signed in on this phone until you log out.</p>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-secondary p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("h-10 rounded-lg text-sm font-semibold", (mode === m || (m === "in" && mode === "forgot")) ? "bg-card shadow" : "text-muted-foreground")}
            >
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (mode === "in" ? signIn() : mode === "up" ? signUp() : reset());
          }}
        >
          {mode === "forgot" && (
            <p className="text-sm text-muted-foreground">Enter your mobile or email and the 4-digit recovery PIN you set, then choose a new password.</p>
          )}
          {mode !== "up" ? (
            <Field label="Mobile number or email">
              <Input className="h-12 text-base" value={id} onChange={(e) => setId(e.target.value)} placeholder="98765 43210 or you@shop.com" autoComplete="username" />
            </Field>
          ) : (
            <>
              <Field label="Your name / Shop name">
                <Input className="h-12 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kirana Store" />
              </Field>
              <Field label="Mobile number">
                <Input
                  className="h-12 text-base"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("+") || val.startsWith("0") || val.includes(" ") || val.includes("-")) {
                      setPhone(normalizePhone(val));
                    } else {
                      setPhone(val);
                    }
                  }}
                  onBlur={() => setPhone(normalizePhone(phone))}
                  placeholder="98765 43210"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Email">
                <Input className="h-12 text-base" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@shop.com" autoComplete="email" />
              </Field>
            </>
          )}
          {mode === "forgot" && pinInput("4-digit recovery PIN")}
          <Field label={mode === "forgot" ? "New password" : "Password"}>
            <Input className="h-12 text-base" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
          {mode !== "in" && (
            <Field label={mode === "forgot" ? "Confirm new password" : "Confirm password"}>
              <Input className="h-12 text-base" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </Field>
          )}
          {mode === "up" && (
            <>
              {pinInput("4-digit recovery PIN")}
              <p className="-mt-2 text-xs text-muted-foreground">Remember this PIN — you'll need it if you forget your password.</p>
            </>
          )}
          {mode === "in" && (
            <button type="button" className="text-sm text-primary font-medium" onClick={() => { setMode("forgot"); setPw(""); setPw2(""); setRpin(""); }}>
              Forgot password?
            </button>
          )}
          <Button type="submit" className="w-full h-14 text-base" disabled={busy}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Reset password"}
          </Button>
          {mode === "forgot" && (
            <button type="button" className="w-full text-sm text-muted-foreground" onClick={() => setMode("in")}>Back to sign in</button>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
