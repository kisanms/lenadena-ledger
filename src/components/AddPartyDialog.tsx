import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Contact } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { PartyKind } from "@/lib/ledger";

type ContactsNav = Navigator & {
  contacts?: { select: (p: string[], o?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]> };
};

export function AddPartyDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: PartyKind;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canPick = typeof navigator !== "undefined" && "contacts" in navigator;

  const pick = async () => {
    try {
      const res = await (navigator as ContactsNav).contacts!.select(["name", "tel", "email"], { multiple: false });
      const c = res[0];
      if (c) {
        setName(c.name?.[0] ?? "");
        setPhone(c.tel?.[0]?.replace(/[^\d+]/g, "") ?? "");
        setEmail(c.email?.[0] ?? "");
      }
    } catch {
      toast.error("Couldn't open contacts");
    }
  };

  const save = async () => {
    if (!name.trim()) return void toast.error("Enter a name");
    setSaving(true);
    const { data, error } = await supabase
      .from("parties")
      .insert({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null, kind })
      .select()
      .single();
    setSaving(false);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["parties"] });
    setName("");
    setPhone("");
    setEmail("");
    onOpenChange(false);
    navigate({ to: "/party/$id", params: { id: data.id } });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="font-display text-2xl">
              Add {kind === "customer" ? "Customer" : "Supplier"}
            </DrawerTitle>
          </DrawerHeader>
          {canPick && (
            <Button variant="secondary" className="w-full h-12 mb-4" onClick={pick}>
              <Contact className="mr-2 h-5 w-5" /> Pick from phone contacts
            </Button>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" className="h-12" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kirana" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pphone">WhatsApp / Mobile number</Label>
              <Input id="pphone" className="h-12" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pemail">Email (optional)</Label>
              <Input id="pemail" className="h-12" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
            </div>
            <p className="text-xs text-muted-foreground">If they use LenaDena with this mobile or email, they'll see this khata live.</p>
            <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
