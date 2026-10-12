import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Lock,
  MessageCircle,
  Smartphone,
  Users,
  WifiOff,
  Shield,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LenaDena — Digital Khata" },
      { name: "description", content: "Learn all about LenaDena digital ledger app features, privacy, and how it works." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/settings", replace: true });
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
          <h1 className="text-xl font-bold">About LenaDena</h1>
          <p className="text-xs text-muted-foreground">Digital Khata & Ledger Guide</p>
        </div>
      </header>

      {/* Hero Card */}
      <section className="mx-4 mt-5 rounded-2xl bg-gradient-to-b from-primary/10 via-primary/5 to-card border p-5 text-center space-y-3 shadow-sm">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">LenaDena (लेना-देना)</h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            100% Free &amp; Secure Digital Khata
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          LenaDena replaces paper ledger books (बही-खाता) with a simple, modern app for Indian shopkeepers, wholesalers, freelancers, and small businesses to record daily credit &amp; payments.
        </p>
      </section>

      {/* Feature Breakdown */}
      <section className="mx-4 mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1">
          How it works &amp; features
        </h2>

        {/* Feature 1 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Customers &amp; Suppliers</h3>
              <p className="text-xs text-muted-foreground">Separate books for Lena &amp; Dena</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Track people who owe you money under <strong>Customers (लेना)</strong> and people you need to pay under <strong>Suppliers (देना)</strong>. Swipe left or right on the dashboard to quickly switch between them.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Quick Entries ("Gave" / "Got")</h3>
              <p className="text-xs text-muted-foreground">Fast, 2-tap transaction recording</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Tap <strong>Gave (Maine Diye)</strong> when you provide goods or credit, or <strong>Got (Maine Liye)</strong> when payment is received. Add optional notes and dates; your balance updates automatically in real-time.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">WhatsApp Receipts &amp; Reminders</h3>
              <p className="text-xs text-muted-foreground">Collect dues up to 3x faster</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Send instant payment reminders, itemized bills, and acknowledgments on WhatsApp with one click. Messages clearly show the balance and date, plus your app download link.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">PDF Account Statements</h3>
              <p className="text-xs text-muted-foreground">Download &amp; print anytime</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Generate clean, professional PDF bills for any period (This Month, Last Month, Last 30 Days, or Custom Date Range) with opening balance and complete debit/credit entries.
          </p>
        </div>

        {/* Feature 5 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">PIN Lock &amp; Password Recovery</h3>
              <p className="text-xs text-muted-foreground">Keep your khata private</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Enable a 4-digit security PIN so others cannot snoop on your finances when holding your phone. Set a 4-digit Recovery PIN to securely reset your password anytime without an email delay.
          </p>
        </div>

        {/* Feature 6 */}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-primary/10 text-primary shrink-0">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Works Offline &amp; Auto-Syncs</h3>
              <p className="text-xs text-muted-foreground">Never lose a transaction</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-12">
            Add entries even when internet connection is poor or unavailable. All changes are stored safely on your phone and automatically synced to the encrypted cloud database once reconnected.
          </p>
        </div>
      </section>

      {/* Trust & Privacy */}
      <section className="mx-4 mt-6 rounded-2xl bg-card border p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Shield className="h-4 w-4" />
          <span>Our Privacy Promise</span>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p><strong>100% Free</strong> with zero subscriptions and zero ads.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p><strong>Your data is private</strong>: We never share or sell customer contact lists or transaction amounts.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p><strong>Secure Cloud Backup</strong> powered by Supabase with Row Level Security encryption.</p>
          </div>
        </div>
      </section>

      {/* App Info & Links */}
      <section className="mx-4 mt-6 rounded-2xl bg-card border p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Application Details
        </h3>
        <div className="divide-y text-xs">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">App Name</span>
            <span className="font-medium">LenaDena — Digital Khata</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Android APK</span>
            <a
              href="https://lenadena-one-stop-solution.vercel.app/apk"
              className="font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> Download APK
            </a>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Web Version</span>
            <span className="font-medium">lenadena-one-stop-solution.vercel.app</span>
          </div>
        </div>
      </section>

      {/* Back button */}
      <div className="mx-4 mt-6">
        <Button variant="outline" className="w-full h-11" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
      </div>
    </div>
  );
}
