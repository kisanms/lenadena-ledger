import QRCode from "qrcode";

export type UpiPaymentParams = {
  pa: string; // VPA / UPI ID, e.g. "shop@okaxis"
  pn?: string | null | undefined; // Payee display name
  am?: number | string | null | undefined; // Amount in INR
  tn?: string | null | undefined; // Transaction note
};

/**
 * Validates standard UPI VPA format (e.g. username@bank, 9876543210@paytm).
 */
export function isValidUpiId(id: string): boolean {
  if (!id) return false;
  const clean = id.trim();
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/.test(clean);
}

/** Encode query values with percent-encoded spaces (%20), not form-style plus signs.
 * Some UPI apps parse deep-link parameters more strictly than browsers.
 */
function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function buildPaymentParams(opts: UpiPaymentParams, includeCurrency: boolean): string {
  const { pa, pn, am, tn } = opts;
  const params: Array<[string, string]> = [["pa", pa.trim()]];

  if (pn?.trim()) params.push(["pn", pn.trim()]);
  if (am !== undefined && am !== null) {
    const num = typeof am === "number" ? am : Number(String(am).trim());
    if (Number.isFinite(num) && num > 0) params.push(["am", num.toFixed(2)]);
  }
  if (includeCurrency) params.push(["cu", "INR"]);
  if (tn?.trim()) params.push(["tn", tn.trim()]);

  return params.map(([key, value]) => `${key}=${encodeQueryValue(value)}`).join("&");
}

/**
 * Constructs a standard UPI payment URI (upi://pay?...). Keep values percent-encoded
 * and include only the payment details supplied by the shopkeeper.
 */
export function buildUpiUri(opts: UpiPaymentParams): string {
  return `upi://pay?${buildPaymentParams(opts, true)}`;
}

/**
 * Constructs the HTTPS page link for WhatsApp reminders. The page then lets the
 * customer launch their UPI app with a deliberate tap, or use the QR/copy fallback.
 */
export function buildWebPayUrl(opts: UpiPaymentParams, origin?: string): string {
  const base =
    origin && origin.startsWith("http")
      ? origin
      : typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://lenadena-one-stop-solution.vercel.app";

  return `${base.replace(/\/+$/, "")}/pay?${buildPaymentParams(opts, false)}`;
}

/**
 * Generates a PNG Base64 Data URL for QR Code embedding in PDF and web UI.
 */
export async function generateUpiQr(upiUri: string, size = 260): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
