export const inr = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

/**
 * Normalizes any mobile number.
 * Strips +91, 0091, leading 0, spaces, dashes, and parentheses for Indian numbers into clean 10 digits.
 * Retains international format for non-Indian numbers.
 */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let cleaned = raw.trim().replace(/[\s\-\.\(\)]/g, "");

  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("0091")) {
    cleaned = cleaned.slice(4);
  }

  const digits = cleaned.replace(/\D/g, "");

  // 12 digits starting with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  // 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  // 10 digits (standard Indian mobile)
  if (digits.length === 10) {
    return digits;
  }

  // International numbers with +
  if (raw.trim().startsWith("+")) {
    return "+" + digits;
  }

  return digits || cleaned;
}

/** Formats a 10-digit number nicely as 98765 43210 for display */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "";
  const norm = normalizePhone(phone);
  if (norm.length === 10) {
    return `${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return phone;
}

/** Converts a phone number to wa.me format, defaulting to India (+91). */
export function waNumber(phone?: string | null) {
  if (!phone) return "";
  const norm = normalizePhone(phone);
  let d = norm.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return d;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
