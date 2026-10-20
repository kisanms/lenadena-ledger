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
 * Constructs a standard NPCI UPI URI (upi://pay?...)
 * Triggers PhonePe, Google Pay, Paytm, BHIM or any installed banking app on mobile.
 */
export function buildUpiUri(opts: UpiPaymentParams): string {
    const { pa, pn, am, tn } = opts;
    const params = new URLSearchParams();
    params.set("pa", pa.trim());
    if (pn && pn.trim()) params.set("pn", pn.trim());
    if (am !== undefined && am !== null) {
        const num = typeof am === "number" ? am : parseFloat(String(am));
        if (!isNaN(num) && num > 0) {
            params.set("am", num.toFixed(2));
        }
    }
    params.set("cu", "INR");
    if (tn && tn.trim()) params.set("tn", tn.trim());
    return `upi://pay?${params.toString()}`;
}

/**
 * Constructs the web redirect link for WhatsApp reminders.
 * Standard WhatsApp does not make upi:// clickable in plain text,
 * so this directs the payer to the web page which automatically opens the UPI app.
 */
export function buildWebPayUrl(opts: UpiPaymentParams, origin?: string): string {
    const base =
        origin && origin.startsWith("http")
            ? origin
            : typeof window !== "undefined" && window.location.origin
                ? window.location.origin
                : "https://lenadena-one-stop-solution.vercel.app";

    const { pa, pn, am, tn } = opts;
    const params = new URLSearchParams();
    params.set("pa", pa.trim());
    if (pn && pn.trim()) params.set("pn", pn.trim());
    if (am !== undefined && am !== null) {
        const num = typeof am === "number" ? am : parseFloat(String(am));
        if (!isNaN(num) && num > 0) {
            params.set("am", num.toFixed(2));
        }
    }
    if (tn && tn.trim()) params.set("tn", tn.trim());

    return `${base.replace(/\/+$/, "")}/pay?${params.toString()}`;
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