import { useEffect, useState } from "react";
import { MessageCircle, Pencil, Trash2, QrCode, Receipt, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "@/components/ShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fmtDate, fmtTime, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildUpiUri, generateUpiQr, isValidUpiId } from "@/lib/upi";
import { deliverImage, renderBillSlip, renderPayCard } from "@/lib/cards";
import type { Entry } from "@/lib/ledger";

export function useReceiptUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    supabase.storage.from("receipts").createSignedUrl(path, 3600).then(({ data }) => {
      if (live) setUrl(data?.signedUrl ?? supabase.storage.from("receipts").getPublicUrl(path).data.publicUrl);
    });
    return () => { live = false; };
  }, [path]);
  return url;
}

type Row = Entry & { running: number };

export function EntryDetailSheet(props: {
  entry: Row | null;
  onClose: () => void;
  partyName: string;
  phone?: string | null;
  business: string;
  upiId?: string | null | undefined;
  canEdit: boolean;
  gaveLabel: string;
  gotLabel: string;
  message: string;
  isCreditDue: boolean;
  showPay: boolean;
  isShared?: boolean;
  canRemind?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewPhoto: (url: string) => void;
}) {
  const { t } = useI18n();
  const e = props.entry;
  const photo = useReceiptUrl(e?.bill_path);
  const [qr, setQr] = useState<string | null>(null);
  const [remindOpen, setRemindOpen] = useState(false);

  const showPay = props.showPay && !!e;
  const validUpi = !!props.upiId && isValidUpiId(props.upiId);
  const payAmount = e ? Math.max(e.running > 0 ? e.running : e.amount, 0) : 0;
  const uri = validUpi && e ? buildUpiUri({ pa: props.upiId!, pn: props.business, am: payAmount, tn: `Due ${props.partyName}` }) : "";

  useEffect(() => { setQr(null); }, [e?.id]);

  if (!e) return null;
  // Red (text-loss) if it's credit due, Green (text-gain) if it's payment
  const color = props.isCreditDue ? "text-loss" : "text-gain";

  // Balance calculation: for customer (isShared), negative running means money owed (Due), NOT Advance!
  const effectiveRunning = props.isShared ? -e.running : e.running;
  const balLabel = effectiveRunning > 0 ? t("cs_due") : effectiveRunning < 0 ? t("cs_advance") : t("cs_settled");
  const balColor = effectiveRunning > 0 ? "text-loss" : effectiveRunning < 0 ? "text-gain" : "";

  const slip = async (mode: "save" | "share") => {
    try {
      const blob = await renderBillSlip({
        business: props.business,
        party: props.partyName,
        date: `${fmtDate(e.entry_date)} ${fmtTime(e.entry_date)}`,
        direction: e.direction,
        dirLabel: props.isCreditDue ? props.gaveLabel : props.gotLabel,
        amount: e.amount,
        note: e.note,
        balance: e.running,
        balanceLabel: `Balance (${effectiveRunning > 0 ? "Due" : effectiveRunning < 0 ? "Advance" : "Settled"})`,
      });
      await deliverImage(blob, `LenaDena-Slip-${props.partyName.replace(/\W+/g, "-")}.png`, mode);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not create slip"); }
  };

  const card = async (mode: "save" | "share") => {
    try {
      const blob = await renderPayCard({
        payee: props.business,
        upiId: props.upiId!,
        amount: payAmount,
        uri,
        note: `Bill payment - ${props.partyName}`,
      });
      await deliverImage(blob, `LenaDena-Pay-${props.partyName.replace(/\W+/g, "-")}.png`, mode);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not create card"); }
  };

  return (
    <>
      <Drawer open={!!e} onOpenChange={(o) => !o && props.onClose()}>
        <DrawerContent className="max-h-[92dvh]">
          <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 text-center">
              <DrawerTitle className="text-sm font-medium text-muted-foreground">{t("cs_details")}</DrawerTitle>
              <p className={cn("text-5xl font-extrabold font-display mt-2", color)}>{inr(e.amount)}</p>
              <p className="text-xs text-muted-foreground">{props.isCreditDue ? props.gaveLabel : props.gotLabel}</p>
            </DrawerHeader>

            <div className="space-y-2.5">
              {photo && (
                <button onClick={() => props.onViewPhoto(photo)} className="block w-full overflow-hidden rounded-2xl border bg-muted">
                  <img src={photo} alt="Bill" className="max-h-56 w-full object-cover" />
                </button>
              )}
              <div className="rounded-2xl bg-card border divide-y">
                {e.note && <div className="p-3"><p className="text-xs text-muted-foreground">{t("cs_notes")}</p><p className="font-medium">{e.note}</p></div>}
                <div className="p-3 flex justify-between text-sm"><span className="text-muted-foreground">{t("cs_added_on")}</span><span>{fmtDate(e.entry_date)} {fmtTime(e.entry_date)}</span></div>
                {e.due_date && props.isCreditDue && (
                  <div className="p-3 flex justify-between text-sm"><span className="text-muted-foreground">{t("promised_by")}</span><span className="text-amber-700 dark:text-amber-300 font-medium">{fmtDate(e.due_date)}</span></div>
                )}
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cs_balance_after")}</span>
                  <span className={cn("font-semibold", balColor)}>{inr(Math.abs(e.running))} {balLabel}</span>
                </div>
              </div>

              {/* PAYMENT QR (Visible to customer to pay directly) */}
              {showPay && (
                <div className="rounded-2xl border bg-card p-3">
                  {!validUpi ? (
                    <p className="text-sm text-muted-foreground text-center py-2">{t("cs_no_upi")}</p>
                  ) : !qr ? (
                    <Button variant="outline" className="w-full h-11" onClick={async () => setQr(await generateUpiQr(uri, 320))}>
                      <QrCode className="mr-2 h-4 w-4" /> {t("cs_pay_qr")} · {inr(payAmount)}
                    </Button>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">{t("cs_amount_due")}</p>
                      <p className="text-3xl font-extrabold text-gain">{inr(payAmount)}</p>
                      <img src={qr} alt="UPI QR" className="mx-auto h-52 w-52 rounded-xl bg-background p-2" />
                      <p className="font-mono text-sm">{props.upiId}</p>
                      <p className="text-xs text-muted-foreground">{t("cs_scan_pay")}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => card("save")}><Download className="mr-1 h-4 w-4" />{t("cs_save_card")}</Button>
                        <Button variant="secondary" onClick={() => card("share")}><Share2 className="mr-1 h-4 w-4" />{t("cs_share_card")}</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => slip("save")}><Receipt className="mr-1 h-4 w-4" />{t("cs_bill_slip")}</Button>
                <Button variant="secondary" onClick={() => slip("share")}><Share2 className="mr-1 h-4 w-4" />{t("cs_share_card")}</Button>
                {props.canEdit && <>
                  <Button variant="outline" onClick={props.onEdit}><Pencil className="mr-1 h-4 w-4" />{t("cs_edit")}</Button>
                  <Button variant="outline" className="text-destructive" onClick={props.onDelete}><Trash2 className="mr-1 h-4 w-4" />{t("cs_delete")}</Button>
                </>}
              </div>

              {/* Reminder button ONLY for Supplier. Hidden for Customer */}
              {props.canRemind && (
                <div className="pt-1">
                  <Button
                    className="w-full h-12 bg-whatsapp hover:bg-whatsapp/90 text-gain-foreground font-semibold"
                    onClick={() => setRemindOpen(true)}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" /> Send Reminder (WhatsApp / SMS)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {props.canRemind && (
        <ShareDialog
          open={remindOpen}
          onOpenChange={setRemindOpen}
          text={props.message}
          phone={props.phone}
          title="Send Reminder"
        />
      )}
    </>
  );
}

export function BubblePhoto({ path, label }: { path: string; label: string }) {
  const url = useReceiptUrl(path);
  return url ? <img src={url} alt={label} className="mt-2 h-28 w-full rounded-lg object-cover" loading="lazy" /> : null;
}
