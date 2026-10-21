import { describe, expect, it } from "vitest";
import {
  buildUpiUri,
  buildWebPayUrl,
  encodeUpiParam,
  getQrFilename,
  isValidUpiId,
  sanitizeUpiText,
  generateUpiQr,
} from "./upi";

describe("UPI Utility Functions", () => {
  describe("isValidUpiId", () => {
    it("validates standard UPI IDs accurately", () => {
      expect(isValidUpiId("majumdarkishan46-1@okicici")).toBe(true);
      expect(isValidUpiId("9876543210@paytm")).toBe(true);
      expect(isValidUpiId("shop.store@ybl")).toBe(true);
      expect(isValidUpiId("merchant_123@hdfcbank")).toBe(true);
    });

    it("rejects invalid UPI IDs", () => {
      expect(isValidUpiId("")).toBe(false);
      expect(isValidUpiId("plainstring")).toBe(false);
      expect(isValidUpiId("missingbank@")).toBe(false);
      expect(isValidUpiId("@nohandle")).toBe(false);
      expect(isValidUpiId("has spaces@oksbi")).toBe(false);
    });
  });

  describe("UPI Parameter Encoding (buildUpiUri)", () => {
    it("encodes spaces strictly with %20 instead of +", () => {
      const uri = buildUpiUri({
        pa: "shop@okaxis",
        pn: "Kisan Kirana Store",
        am: 150,
        tn: "Monthly Groceries",
      });

      expect(uri).toContain("pn=Kisan%20Kirana%20Store");
      expect(uri).toContain("tn=Monthly%20Groceries");
      expect(uri).not.toContain("+");
    });

    it("sanitizes special characters in payee names and notes", () => {
      const uri = buildUpiUri({
        pa: "shop@okaxis",
        pn: "Rupa & Sons / Co. #42",
        am: 250.75,
        tn: "Bill #123 & payment = full",
      });

      // Special characters like &, #, =, /, \ must be stripped/sanitized
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("am=250.75");
      expect(uri).not.toContain("&Sons");
      expect(uri).not.toContain("#42");
      expect(uri).not.toContain("=full");
    });

    it("formats amount with exactly two decimal places", () => {
      const uri = buildUpiUri({
        pa: "shop@okaxis",
        am: 1,
      });
      expect(uri).toContain("am=1.00");
    });

    it("omits invalid or non-positive amounts", () => {
      const uri = buildUpiUri({
        pa: "shop@okaxis",
        am: 0,
      });
      expect(uri).not.toContain("am=");
    });
  });

  describe("Clean Web Payment URLs (buildWebPayUrl)", () => {
    it("generates a clean URL without escaping @ to %40 for trust and readability", () => {
      const url = buildWebPayUrl({
        pa: "majumdarkishan46-1@okicici",
        pn: "Kisan",
        am: 1,
        tn: "Bill - Rupa",
      });

      // Contains unescaped @ for human readability in WhatsApp
      expect(url).toContain("pa=majumdarkishan46-1@okicici");
      // Integer amount is concise (am=1 instead of am=1.00)
      expect(url).toContain("am=1");
      expect(url).toContain("pn=Kisan");
    });

    it("formats fractional amounts with 2 decimal places", () => {
      const url = buildWebPayUrl({
        pa: "shop@okaxis",
        am: 149.5,
      });
      expect(url).toContain("am=149.50");
    });
  });

  describe("Descriptive QR Filename (getQrFilename)", () => {
    it("generates clean descriptive filename for downloading QR code", () => {
      expect(getQrFilename("Kisan", 1)).toBe("LenaDena-Pay-Kisan-Rs1-QR.png");
      expect(getQrFilename("Ramesh Kirana Store", 500)).toBe(
        "LenaDena-Pay-Ramesh-Kirana-Store-Rs500-QR.png",
      );
      expect(getQrFilename("A & B Co. #99", 1250)).toBe("LenaDena-Pay-A-B-Co-99-Rs1250-QR.png");
    });

    it("handles missing or empty names gracefully", () => {
      expect(getQrFilename("", null)).toBe("LenaDena-Pay-Merchant-QR.png");
    });
  });

  describe("QR Code Generation", () => {
    it("generates a valid base64 PNG data URL", async () => {
      const qrDataUrl = await generateUpiQr("upi://pay?pa=shop@okaxis&pn=Shop&am=10.00&cu=INR");
      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
