import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const APK_URL = "https://github.com/kisanms/lenadena-ledger/releases/download/apk/LenaDena-release.apk";

export const Route = createFileRoute("/apk")({
  head: () => ({
    meta: [
      { title: "Download LenaDena APK — Digital Khata" },
      { name: "description", content: "Directly download the official LenaDena Android app." },
    ],
  }),
  component: ApkDownloadPage,
});

function ApkDownloadPage() {
  useEffect(() => {
    // Automatically trigger APK download when page opens
    const timer = setTimeout(() => {
      window.location.href = APK_URL;
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-dvh flex flex-col justify-between p-6 max-w-md mx-auto text-center">
      <header className="flex justify-between items-center w-full">
        <Logo size="sm" />
        <a href="/" className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Web App
        </a>
      </header>

      <main className="flex flex-col items-center justify-center my-auto py-8">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-sm">
          <Download className="h-10 w-10 animate-bounce" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Downloading LenaDena</h1>
        <p className="text-muted-foreground text-sm max-w-xs mb-8">
          Your APK download will start automatically in a moment.
        </p>

        <Button asChild className="w-full h-12 text-base font-semibold rounded-xl">
          <a href={APK_URL} download>
            <Download className="h-5 w-5 mr-2" /> Click here if download doesn't start
          </a>
        </Button>
      </main>

      <footer className="text-xs text-muted-foreground py-4">
        LenaDena Digital Khata • Android 8.0+
      </footer>
    </div>
  );
}
