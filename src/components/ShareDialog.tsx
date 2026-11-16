import { MessageCircle, MessageSquare, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { waNumber } from "@/lib/format";
import { smsLink } from "@/lib/cards";

export function shareWhatsApp(phone: string | null | undefined, text: string) {
  const n = waNumber(phone);
  const url = `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

export async function shareNative(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: "LenaDena", text });
    } catch {
      /* cancelled */
    }
  } else {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }
}

export function ShareDialog({
  open,
  onOpenChange,
  text,
  phone,
  title = "Send Reminder",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  text: string;
  phone?: string | null;
  title?: string;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl">{title}</DrawerTitle>
          </DrawerHeader>
          <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs font-sans mb-4 max-h-40 overflow-y-auto">{text}</pre>
          <div className="space-y-2.5">
            <Button
              className="w-full h-12 bg-whatsapp text-gain-foreground hover:bg-whatsapp/90 font-semibold"
              onClick={() => {
                shareWhatsApp(phone, text);
                onOpenChange(false);
              }}
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Send on WhatsApp
            </Button>

            <Button asChild variant="secondary" className="w-full h-12 font-semibold">
              <a href={smsLink(phone, text)} onClick={() => onOpenChange(false)}>
                <MessageSquare className="mr-2 h-5 w-5" /> Send via SMS (Free SIM)
              </a>
            </Button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  shareNative(text);
                  onOpenChange(false);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" /> Other Apps
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  toast.success("Copied to clipboard");
                  onOpenChange(false);
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Text
              </Button>
            </div>

            <Button variant="ghost" className="w-full mt-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
