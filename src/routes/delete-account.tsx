import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { clearLock } from "@/lib/lock";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Account — LenaDena" },
      { name: "description", content: "Manage account deletion and data reset." },
    ],
  }),
  component: DeleteAccountPage,
});

type DeletionMode = "wipe_all" | "keep_data";

function DeleteAccountPage() {
  const { session, signOut } = useAuth();
  const uid = session?.user.id;
  const email = session?.user.email;
  const navigate = useNavigate();

  const [mode, setMode] = useState<DeletionMode>("wipe_all");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/settings", replace: true });
    }
  };

  const handleDelete = async () => {
    if (!uid || !email) {
      toast.error("You must be signed in to perform this action.");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter your password to confirm.");
      return;
    }

    if (!consent) {
      toast.error("Please tick the consent box to proceed.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Verify user password against Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: password.trim(),
      });

      if (authError || !authData.user) {
        toast.error("Incorrect password. Please verify your current password.");
        setIsSubmitting(false);
        return;
      }

      // 2. Perform selected deletion mode
      if (mode === "wipe_all") {
        // Mode A: Permanently delete all ledger data AND the auth user account
        // Calling secure RPC function that completely removes rows from
        // entries, parties, push_subs, recovery_pins, profiles, and auth.users
        const { error: rpcError } = await supabase.rpc("delete_user_account");

        if (rpcError) {
          console.error("delete_user_account RPC error:", rpcError);
          // If RPC is missing in DB, provide helpful instructions
          toast.error(
            `Database deletion failed: ${rpcError.message}. Please apply the delete_user_account migration in your Lovable Cloud/Supabase SQL editor.`
          );
          setIsSubmitting(false);
          return;
        }

        // Clear local locks and cached credentials
        clearLock();
        localStorage.removeItem("ld_pin_hash");
        localStorage.removeItem("ld_unlocked");

        // Clear local Supabase tokens
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch (e) {
          console.warn("Local sign-out cleanup:", e);
        }

        toast.success("All your business data and login account have been permanently deleted.");
        navigate({ to: "/welcome", replace: true });
      } else {
        // Mode B: Disconnect / Reset account on this device, but keep cloud ledger for future login
        await supabase.from("push_subs").delete().eq("user_id", uid);

        // Clear local locks and device session
        clearLock();
        localStorage.removeItem("ld_pin_hash");
        localStorage.removeItem("ld_unlocked");

        await signOut();
        toast.success(
          "Account disconnected from this device. Your business records remain safely stored in the cloud for future login."
        );
        navigate({ to: "/welcome", replace: true });
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error)?.message || "Something went wrong while processing your request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh max-w-md mx-auto pb-12">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-5 sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
        <button
          type="button"
          onClick={handleBack}
          className="grid place-items-center h-10 w-10 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-destructive flex items-center gap-1.5">
            <Trash2 className="h-5 w-5" /> Delete Account
          </h1>
          <p className="text-xs text-muted-foreground">Manage your account &amp; data deletion</p>
        </div>
      </header>

      {/* Warning Box */}
      <div className="mx-4 mt-5 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex gap-3 text-destructive">
        <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sm">Please read carefully</p>
          <p className="leading-relaxed opacity-90">
            Choose whether you want to completely erase all your business records and delete your login, or disconnect your account while keeping records safe for future login.
          </p>
        </div>
      </div>

      {/* Option Selection */}
      <section className="mx-4 mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Select Deletion Option
        </h2>

        {/* Option 1: Permanent Wipe */}
        <div
          onClick={() => setMode("wipe_all")}
          className={`cursor-pointer rounded-2xl border p-4 space-y-2 transition ${
            mode === "wipe_all"
              ? "bg-destructive/5 border-destructive ring-1 ring-destructive"
              : "bg-card border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-destructive">
              <Trash2 className="h-4 w-4" />
              <span>1. Permanently delete user &amp; all data</span>
            </div>
            <div
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                mode === "wipe_all" ? "bg-destructive border-destructive text-white" : "border-muted-foreground"
              }`}
            >
              {mode === "wipe_all" && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Completely deletes <strong>your login credentials, profile, customer and supplier records, and all ledger transactions</strong> from the database. After deletion, you <strong>cannot log in again</strong> with this account.
          </p>
        </div>

        {/* Option 2: Keep data for future login */}
        <div
          onClick={() => setMode("keep_data")}
          className={`cursor-pointer rounded-2xl border p-4 space-y-2 transition ${
            mode === "keep_data"
              ? "bg-primary/5 border-primary ring-1 ring-primary"
              : "bg-card border-border hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-primary">
              <RotateCcw className="h-4 w-4" />
              <span>2. Disconnect &amp; keep data for re-login</span>
            </div>
            <div
              className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                mode === "keep_data" ? "bg-primary border-primary text-white" : "border-muted-foreground"
              }`}
            >
              {mode === "keep_data" && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Clears your session and PIN lock from this phone, but <strong>safely retains your business records and login in the cloud</strong>. When you log back in in the future, all your data will show again.
          </p>
        </div>
      </section>

      {/* Password & Consent Section */}
      <section className="mx-4 mt-6 rounded-2xl bg-card border p-4 space-y-4">
        <h2 className="font-semibold text-sm">Security Confirmation</h2>

        <div className="space-y-1.5">
          <Label htmlFor="del-pass" className="text-xs">
            Enter your account password
          </Label>
          <div className="relative">
            <Input
              id="del-pass"
              type={showPassword ? "text" : "password"}
              className="h-12 pr-10"
              placeholder="Your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Verifies that you are the rightful owner of <strong>{email}</strong>.
          </p>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="consent-check"
            checked={consent}
            onCheckedChange={(checked) => setConsent(Boolean(checked))}
            className="mt-0.5"
          />
          <Label
            htmlFor="consent-check"
            className="text-xs text-muted-foreground leading-snug cursor-pointer select-none font-normal"
          >
            I have verified my selection and understand the consequences. I give my full consent to proceed with this action.
          </Label>
        </div>

        {/* Delete Action Button */}
        <Button
          variant="destructive"
          className="w-full h-12 font-semibold text-sm gap-2 mt-2"
          disabled={!password || !consent || isSubmitting}
          onClick={handleDelete}
        >
          {isSubmitting ? (
            "Processing..."
          ) : mode === "wipe_all" ? (
            <>
              <Trash2 className="h-4 w-4" /> Permanently Delete Account &amp; Data
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" /> Disconnect &amp; Preserve Data
            </>
          )}
        </Button>
      </section>

      {/* Cancel */}
      <div className="mx-4 mt-4">
        <Button variant="ghost" className="w-full h-11 text-muted-foreground" onClick={handleBack}>
          Cancel &amp; Keep Account
        </Button>
      </div>
    </div>
  );
}
