/**
 * SUITE DE TESTS : P1-11 — Portes de Livraison, CI, ESLint & Playwright
 *
 * Règles validées :
 * - P1-11 : Existence et conformité d'ESLint, Playwright, CI GitHub Actions et scripts de delivery gates.
 * - Non-régression automatique avant tout déploiement.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("P1-11 — Portes de Livraison et Configurations Qualité (CI / Lint / E2E)", () => {
  const rootDir = path.resolve(__dirname, "../..");

  it("garantit l'existence et la validité du fichier de configuration ESLint (.eslintrc.json)", () => {
    const eslintPath = path.join(rootDir, ".eslintrc.json");
    expect(fs.existsSync(eslintPath)).toBe(true);

    const content = fs.readFileSync(eslintPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.extends).toContain("next/core-web-vitals");
  });

  it("garantit l'existence de la configuration Playwright (playwright.config.ts)", () => {
    const playwrightPath = path.join(rootDir, "playwright.config.ts");
    expect(fs.existsSync(playwrightPath)).toBe(true);

    const content = fs.readFileSync(playwrightPath, "utf-8");
    expect(content).toContain("testDir: \"./tests/e2e\"");
    expect(content).toContain("webServer:");
    expect(content).toContain("pnpm build && pnpm start");
    expect(content).toContain('NEXT_PUBLIC_OBASA_DEMO_MODE: "true"');
  });

  it("garantit la présence du workflow GitHub Actions CI (ci/github-actions-ci.yml ou .github/workflows/ci.yml)", () => {
    const ciPath1 = path.join(rootDir, "ci/github-actions-ci.yml");
    const ciPath2 = path.join(rootDir, ".github/workflows/ci.yml");
    const exists = fs.existsSync(ciPath1) || fs.existsSync(ciPath2);
    expect(exists).toBe(true);

    const content = fs.readFileSync(fs.existsSync(ciPath1) ? ciPath1 : ciPath2, "utf-8");
    expect(content).toContain("pnpm test:unit");
    expect(content).toContain("pnpm exec tsc --noEmit");
    expect(content).toContain("pnpm build");
    expect(content).toContain("pnpm lint");
  });

  it("garantit la présence des scripts verify et test:coverage dans package.json", () => {
    const pkgPath = path.join(rootDir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkg.scripts["verify"]).toBeDefined();
    expect(pkg.scripts["test:coverage"]).toBeDefined();
    expect(pkg.scripts["lint"]).toBeDefined();
    expect(pkg.scripts["test:unit"]).toBeDefined();
    expect(pkg.scripts["test:e2e"]).toBeDefined();
  });
});
