import { generateUpiQr } from "@/lib/upi";

const W = 720;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const money = (n: number) => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function toBlob(c: HTMLCanvasElement) {
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Image failed"))), "image/png"));
}

/** Share via native share sheet when files are supported, else download. */
export async function deliverImage(blob: Blob, filename: string, mode: "save" | "share" = "save") {
  const file = new File([blob], filename, { type: "image/png" });
  if (mode === "share" && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch { /* cancelled */ return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function renderPayCard(o: { payee: string; upiId: string; amount: number; uri: string; note?: string }) {
  const H = 1080;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#0f5132"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#ffffff"; rr(x, 40, 40, W - 80, H - 80, 36); x.fill();
  x.textAlign = "center";
  x.fillStyle = "#6b7280"; x.font = "600 26px sans-serif"; x.fillText("PAYING TO", W / 2, 130);
  x.fillStyle = "#111827"; x.font = "800 46px sans-serif"; x.fillText(o.payee.slice(0, 26), W / 2, 190);
  x.fillStyle = "#374151"; x.font = "28px monospace"; x.fillText(o.upiId, W / 2, 236);
  x.fillStyle = "#6b7280"; x.font = "600 24px sans-serif"; x.fillText("AMOUNT DUE", W / 2, 310);
  x.fillStyle = "#15803d"; x.font = "800 76px sans-serif"; x.fillText(money(o.amount), W / 2, 395);
  if (o.note) { x.fillStyle = "#6b7280"; x.font = "italic 24px sans-serif"; x.fillText(o.note.slice(0, 40), W / 2, 440); }
  const qr = await loadImg(await generateUpiQr(o.uri, 440));
  x.drawImage(qr, (W - 440) / 2, 470, 440, 440);
  x.fillStyle = "#374151"; x.font = "24px sans-serif"; x.fillText("Scan with GPay, PhonePe, Paytm or BHIM", W / 2, 950);
  x.fillStyle = "#9ca3af"; x.font = "20px sans-serif"; x.fillText("via LenaDena", W / 2, 995);
  return toBlob(c);
}

export async function renderBillSlip(o: {
  business: string; party: string; date: string; direction: "gave" | "got";
  dirLabel: string; amount: number; note?: string | null; balance: number; balanceLabel: string;
}) {
  const H = 900;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#f3f4f6"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#ffffff"; rr(x, 40, 40, W - 80, H - 80, 28); x.fill();
  x.fillStyle = "#0f5132"; rr(x, 40, 40, W - 80, 140, 28); x.fill(); x.fillRect(40, 140, W - 80, 40);
  x.textAlign = "center"; x.fillStyle = "#ffffff";
  x.font = "800 40px sans-serif"; x.fillText(o.business.slice(0, 28), W / 2, 110);
  x.font = "22px sans-serif"; x.fillText("Transaction receipt", W / 2, 152);
  x.textAlign = "left";
  const row = (label: string, value: string, y: number, color = "#111827", size = 30) => {
    x.fillStyle = "#6b7280"; x.font = "24px sans-serif"; x.fillText(label, 90, y);
    x.fillStyle = color; x.font = `700 ${size}px sans-serif`; x.textAlign = "right"; x.fillText(value, W - 90, y); x.textAlign = "left";
  };
  row("Name", o.party.slice(0, 26), 260);
  row("Date", o.date, 320);
  row("Type", o.dirLabel, 380, o.direction === "gave" ? "#b91c1c" : "#15803d");
  x.strokeStyle = "#e5e7eb"; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(90, 420); x.lineTo(W - 90, 420); x.stroke(); x.setLineDash([]);
  row("Amount", money(o.amount), 500, o.direction === "gave" ? "#b91c1c" : "#15803d", 54);
  if (o.note) row("Note", o.note.slice(0, 28), 570);
  x.strokeStyle = "#e5e7eb"; x.beginPath(); x.moveTo(90, 620); x.lineTo(W - 90, 620); x.stroke();
  row(o.balanceLabel, money(o.balance), 690, o.balance > 0 ? "#b91c1c" : "#15803d", 40);
  x.textAlign = "center"; x.fillStyle = "#9ca3af"; x.font = "20px sans-serif";
  x.fillText("Generated via LenaDena", W / 2, H - 80);
  return toBlob(c);
}

export async function renderPosCard(o: { store: string; upiId: string; amount: number; uri: string }) {
  const H = 1180;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0038ff"); g.addColorStop(1, "#0a1931");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.textAlign = "center"; x.fillStyle = "#ffffff";
 x.font = "600 24px sans-serif"; x.fillText("LENADENA POS", W / 2, 80);
  x.font = "800 48px sans-serif"; x.fillText(o.store.slice(0, 24), W / 2, 150);
  x.font = "26px monospace"; x.fillStyle = "#c7d2fe"; x.fillText(o.upiId, W / 2, 195);
  x.fillStyle = "#ffffff"; rr(x, 60, 240, W - 120, 760, 32); x.fill();
  x.fillStyle = "#6b7280"; x.font = "600 24px sans-serif";
  x.fillText(o.amount > 0 ? "AMOUNT TO PAY" : "SCAN & PAY ANY AMOUNT", W / 2, 300);
  if (o.amount > 0) { x.fillStyle = "#0038ff"; x.font = "800 80px sans-serif"; x.fillText(money(o.amount), W / 2, 390); }
  const qr = await loadImg(await generateUpiQr(o.uri, 480));
  x.drawImage(qr, (W - 480) / 2, o.amount > 0 ? 420 : 340, 480, 480);
  x.fillStyle = "#374151"; x.font = "22px sans-serif"; x.fillText("GPay · PhonePe · Paytm · BHIM · any UPI app", W / 2, 960);
  x.fillStyle = "#c7d2fe"; x.font = "22px sans-serif";
  x.fillText(new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), W / 2, 1070);
  x.fillText("via LenaDena", W / 2, 1110);
  return toBlob(c);
}

export function smsLink(phone: string | null | undefined, body: string) {
  const n = (phone ?? "").replace(/[^\d+]/g, "");
  const sep = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?";
  return `sms:${n}${sep}body=${encodeURIComponent(body)}`;
}
