import { MessageCircle, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { waNumber } from "@/lib/format";

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
  title = "Entry saved",
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
          <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm font-sans mb-4">{text}</pre>
          <div className="space-y-2">
            <Button className="w-full h-12 bg-whatsapp text-gain-foreground hover:bg-whatsapp/90" onClick={() => shareWhatsApp(phone, text)}>
              <MessageCircle className="mr-2 h-5 w-5" /> Send on WhatsApp
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="h-12" onClick={() => shareNative(text)}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button
                variant="secondary"
                className="h-12"
                onClick={async () => {
                  await navigator.clipboard.writeText(text);
                  toast.success("Copied");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
