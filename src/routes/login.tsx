import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LenaDena" },
      { name: "description", content: "Sign in to your LenaDena digital khata with Google or email code." },
      { property: "og:title", content: "Sign in — LenaDena" },
      { property: "og:description", content: "Access your shop ledger securely." },
    ],
  }),
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  const sendCode = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) return void toast.error("Enter a valid email");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    setSent(true);
    toast.success("Code sent to your email");
  };

  const verify = async (token: string) => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) {
      setCode("");
      toast.error("Invalid or expired code");
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center gap-8">
        <div className="space-y-3">
          <Logo />
          <h1 className="text-3xl font-extrabold tracking-tight">Namaste! Let's open your khata.</h1>
          <p className="text-muted-foreground">You'll stay signed in on this phone until you log out.</p>
        </div>

        {!sent ? (
          <div className="space-y-4">
            <Button variant="outline" className="w-full h-14 text-base bg-card" onClick={google}>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
            </div>
            <Input
              type="email"
              inputMode="email"
              className="h-14 text-base"
              placeholder="you@shop.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="w-full h-14 text-base" onClick={sendCode} disabled={busy}>
              <Mail className="mr-2 h-5 w-5" /> {busy ? "Sending…" : "Get code on email"}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p>
              Enter the 6-digit code sent to <b>{email}</b>
            </p>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) void verify(v);
              }}
              disabled={busy}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-14 w-12 text-xl bg-card" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <div className="flex justify-between text-sm">
              <button className="text-muted-foreground underline" onClick={() => setSent(false)}>Change email</button>
              <button className="text-primary font-semibold" onClick={sendCode} disabled={busy}>Resend code</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
