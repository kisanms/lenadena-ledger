import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { phoneTaken, signInWithPhone } from "@/lib/auth.functions";
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
const isPhone = (s: string) => s.replace(/\D/g, "").length >= 10;

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const phoneLogin = useServerFn(signInWithPhone);
  const checkPhone = useServerFn(phoneTaken);

  const signIn = async () => {
    const v = id.trim();
    if (!pw) return void toast.error("Enter your password");
    setBusy(true);
    try {
      if (isEmail(v)) {
        const { error } = await supabase.auth.signInWithPassword({ email: v.toLowerCase(), password: pw });
        if (error) toast.error("Wrong email or password");
      } else if (isPhone(v)) {
        const r = await phoneLogin({ data: { phone: v, password: pw } });
        if (!r.ok) toast.error(r.error);
        else await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      } else toast.error("Enter a valid mobile number or email");
    } finally {
      setBusy(false);
    }
  };

  const signUp = async () => {
    if (!name.trim()) return void toast.error("Enter your name or shop name");
    if (!isPhone(phone)) return void toast.error("Enter a valid 10-digit mobile number");
    if (!isEmail(email)) return void toast.error("Enter a valid email");
    if (pw.length < 6) return void toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return void toast.error("Passwords don't match");
    setBusy(true);
    try {
      const { taken } = await checkPhone({ data: { phone } });
      if (taken) return void toast.error("This mobile number is already registered");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pw,
        options: {
          emailRedirectTo: window.location.origin,
          data: { phone: phone.trim(), owner_name: name.trim(), business_name: name.trim() },
        },
      });
      if (error) return void toast.error(error.message);
      if (!data.session) toast.success("Account created. Please sign in.");
      else toast.success("Welcome to LenaDena!");
    } finally {
      setBusy(false);
    }
  };

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
              className={cn("h-10 rounded-lg text-sm font-semibold", mode === m ? "bg-card shadow" : "text-muted-foreground")}
            >
              {m === "in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (mode === "in" ? signIn() : signUp());
          }}
        >
          {mode === "in" ? (
            <Field label="Mobile number or email">
              <Input className="h-12 text-base" value={id} onChange={(e) => setId(e.target.value)} placeholder="98765 43210 or you@shop.com" autoComplete="username" />
            </Field>
          ) : (
            <>
              <Field label="Your name / Shop name">
                <Input className="h-12 text-base" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Kirana Store" />
              </Field>
              <Field label="Mobile number">
                <Input className="h-12 text-base" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="tel" />
              </Field>
              <Field label="Email">
                <Input className="h-12 text-base" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@shop.com" autoComplete="email" />
              </Field>
            </>
          )}
          <Field label="Password">
            <Input className="h-12 text-base" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
          {mode === "up" && (
            <Field label="Confirm password">
              <Input className="h-12 text-base" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </Field>
          )}
          <Button type="submit" className="w-full h-14 text-base" disabled={busy}>
            {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
          </Button>
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
