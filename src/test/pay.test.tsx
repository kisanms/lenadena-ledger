import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as RouteModule from "@/routes/pay";

describe("PayPage Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders verified trust badge, payee name, amount, and QR code", async () => {
    vi.spyOn(RouteModule.Route, "useSearch").mockReturnValue({
      pa: "majumdarkishan46-1@okicici",
      pn: "Kisan Kirana",
      am: "500",
      tn: "Monthly Ration #1",
    });

    render(<RouteModule.PayPage />);

    expect(screen.getByText("Verified Direct Khata Bill")).toBeInTheDocument();
    expect(screen.getByText("Kisan Kirana")).toBeInTheDocument();
    expect(screen.getByText("majumdarkishan46-1@okicici")).toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
    expect(screen.getByText(/Monthly Ration/)).toBeInTheDocument();

    // QR image should be rendered once generated
    await waitFor(() => {
      const img = screen.getByAltText(/UPI QR code for Kisan Kirana/);
      expect(img).toBeInTheDocument();
    });
  });

  it("handles tap-to-open UPI app and reveals manual payment fallback", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignMock, origin: "https://test.local" },
    });

    vi.spyOn(RouteModule.Route, "useSearch").mockReturnValue({
      pa: "majumdarkishan46-1@okicici",
      pn: "Kisan",
      am: "1",
    });

    render(<RouteModule.PayPage />);

    const openBtn = screen.getByRole("button", { name: /Open UPI App/i });
    fireEvent.click(openBtn);

    // Verifies window.location.assign was called with standard upi:// URI
    expect(assignMock).toHaveBeenCalledWith(
      expect.stringContaining("upi://pay?pa=majumdarkishan46-1%40okicici"),
    );

    // Verifies the manual fallback step-by-step guide is revealed
    await waitFor(() => {
      expect(screen.getByText(/How to pay manually in 3 quick steps:/i)).toBeInTheDocument();
    });
  });

  it("triggers QR download with descriptive filename and displays confirmation", async () => {
    vi.spyOn(RouteModule.Route, "useSearch").mockReturnValue({
      pa: "majumdarkishan46-1@okicici",
      pn: "Kisan Store",
      am: "250",
    });

    render(<RouteModule.PayPage />);

    // Wait for QR to generate
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save QR to Gallery/i })).toBeInTheDocument();
    });

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    const saveBtn = screen.getByRole("button", { name: /Save QR to Gallery/i });
    fireEvent.click(saveBtn);

    expect(clickSpy).toHaveBeenCalled();
    // Confirms post-download guidance banner appears
    await waitFor(() => {
      expect(screen.getByText(/QR image saved to your device!/i)).toBeInTheDocument();
      expect(screen.getByText(/Scan from Gallery/i)).toBeInTheDocument();
    });
  });

  it("copies UPI ID on click with feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      value: { writeText: writeTextMock },
    });

    vi.spyOn(RouteModule.Route, "useSearch").mockReturnValue({
      pa: "shop@okaxis",
      pn: "Shop",
      am: "100",
    });

    render(<RouteModule.PayPage />);

    const copyBtn = screen.getByRole("button", { name: /Copy UPI ID/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("shop@okaxis");
    await waitFor(() => {
      expect(screen.getByText(/Copied UPI ID!/i)).toBeInTheDocument();
    });
  });

  it("shows invalid payment state when UPI ID is missing", () => {
    vi.spyOn(RouteModule.Route, "useSearch").mockReturnValue({});

    render(<RouteModule.PayPage />);

    expect(screen.getByText("Invalid Payment Link")).toBeInTheDocument();
    expect(screen.getByText(/does not contain a valid UPI ID/i)).toBeInTheDocument();
  });
});
