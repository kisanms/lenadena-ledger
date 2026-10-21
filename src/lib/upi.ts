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

/**
 * Encode query values with percent-encoded spaces (%20), not form-style plus signs.
 * UPI app parsers (GPay, PhonePe, Paytm, BHIM) strictly expect RFC 3986 %20.
 */
export function encodeUpiParam(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Sanitizes payee name or note to remove characters that break NPCI URI parsers.
 */
export function sanitizeUpiText(text: string, maxLength = 60): string {
  return text
    .trim()
    .replace(/[&?=#/\\]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

/**
 * Constructs a standard NPCI UPI URI (upi://pay?...).
 * Uses percent-encoded spaces (%20), strict 2-decimal amounts, and clean parameters.
 */
export function buildUpiUri(opts: UpiPaymentParams): string {
  const { pa, pn, am, tn } = opts;
  const parts: string[] = [`pa=${encodeUpiParam(pa.trim())}`];

  if (pn && pn.trim()) {
    const cleanPn = sanitizeUpiText(pn, 50);
    if (cleanPn) {
      parts.push(`pn=${encodeUpiParam(cleanPn)}`);
    }
  }

  if (am !== undefined && am !== null) {
    const num = typeof am === "number" ? am : parseFloat(String(am).trim());
    if (Number.isFinite(num) && num > 0) {
      parts.push(`am=${num.toFixed(2)}`);
    }
  }

  parts.push("cu=INR");

  if (tn && tn.trim()) {
    const cleanTn = sanitizeUpiText(tn, 50);
    if (cleanTn) {
      parts.push(`tn=${encodeUpiParam(cleanTn)}`);
    }
  }

  return `upi://pay?${parts.join("&")}`;
}

/**
 * Generates a clean, trustworthy, human-readable web payment link.
 * Avoids encoding "@" to "%40" in the query string so the link looks clean and trusted in WhatsApp,
 * and uses whole numbers for integer amounts (e.g., am=1 instead of am=1.00) to keep the link short.
 */
export function buildWebPayUrl(opts: UpiPaymentParams, origin?: string): string {
  const base =
    origin && origin.startsWith("http")
      ? origin
      : typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://lenadena-one-stop-solution.vercel.app";

  const { pa, pn, am, tn } = opts;
  const queryParts: string[] = [];

  // Keep @ readable in the URL query string (RFC 3986 allows @ in query)
  const cleanPa = pa.trim();
  queryParts.push(`pa=${cleanPa}`);

  if (am !== undefined && am !== null) {
    const num = typeof am === "number" ? am : parseFloat(String(am).trim());
    if (Number.isFinite(num) && num > 0) {
      const amStr = Number.isInteger(num) ? num.toString() : num.toFixed(2);
      queryParts.push(`am=${amStr}`);
    }
  }

  if (pn && pn.trim()) {
    const cleanPn = sanitizeUpiText(pn, 40);
    if (cleanPn) {
      queryParts.push(`pn=${encodeURIComponent(cleanPn)}`);
    }
  }

  if (tn && tn.trim()) {
    const cleanTn = sanitizeUpiText(tn, 30);
    if (cleanTn) {
      queryParts.push(`tn=${encodeURIComponent(cleanTn)}`);
    }
  }

  return `${base.replace(/\/+$/, "")}/pay?${queryParts.join("&")}`;
}

/**
 * Builds a descriptive, user-friendly filename for saved QR codes.
 * Example: "LenaDena-Pay-Kisan-Rs500-QR.png"
 */
export function getQrFilename(payee?: string | null, amount?: number | string | null): string {
  const safeName =
    (payee || "Merchant")
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) || "Merchant";

  let amtStr = "";
  if (amount !== undefined && amount !== null) {
    const num = typeof amount === "number" ? amount : parseFloat(String(amount).trim());
    if (Number.isFinite(num) && num > 0) {
      amtStr = `-Rs${Number.isInteger(num) ? num : num.toFixed(0)}`;
    }
  }

  return `LenaDena-Pay-${safeName}${amtStr}-QR.png`;
}

/**
 * Generates a high-quality PNG Base64 Data URL for QR Code embedding.
 */
export async function generateUpiQr(upiUri: string, size = 300): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0a0b0e",
      light: "#ffffff",
    },
  });
}
