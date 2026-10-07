import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  generateOfflineInvoiceNumber,
  assertIntegerAmount,
  cn,
} from "@/lib/utils";

describe("Phase 1 — Core Utility Functions", () => {
  describe("RÈGLE 2 : Integers in FCFA (No Floats)", () => {
    it("formats integer amounts in FCFA with thousands separator", () => {
      expect(formatCurrency(1500)).toBe("1 500 FCFA");
      expect(formatCurrency(250000)).toBe("250 000 FCFA");
      expect(formatCurrency(0)).toBe("0 FCFA");
    });

    it("rounds decimal numbers to integer FCFA", () => {
      expect(formatCurrency(1500.75)).toBe("1 501 FCFA");
      expect(formatCurrency(1500.25)).toBe("1 500 FCFA");
    });

    it("assertIntegerAmount passes for valid integers", () => {
      expect(() => assertIntegerAmount(5000, "unit_price")).not.toThrow();
      expect(() => assertIntegerAmount(0, "discount")).not.toThrow();
    });

    it("assertIntegerAmount throws error for floating point numbers", () => {
      expect(() => assertIntegerAmount(5000.5, "total_cents")).toThrow(
        "[RÈGLE 2 VIOLÉE]"
      );
    });
  });

  describe("RÈGLE 6 : Offline Invoice Numbering", () => {
    it("generates invoice number with format SITE-DEVICE-TIMESTAMP36-RAND3", () => {
      const invNum = generateOfflineInvoiceNumber("COT1", "POS1");
      const parts = invNum.split("-");

      expect(parts.length).toBe(4);
      expect(parts[0]).toBe("COT1");
      expect(parts[1]).toBe("POS1");
      expect(parts[2].length).toBeGreaterThan(5);
      expect(parts[3].length).toBe(3);
    });

    it("generates unique invoice numbers on consecutive calls", () => {
      const inv1 = generateOfflineInvoiceNumber("COT1", "POS1");
      const inv2 = generateOfflineInvoiceNumber("COT1", "POS1");
      expect(inv1).not.toBe(inv2);
    });
  });

  describe("cn Utility", () => {
    it("merges tailwind class names cleanly", () => {
      expect(cn("px-2 py-1", "bg-red-500", "px-4")).toBe("py-1 bg-red-500 px-4");
    });
  });
});
