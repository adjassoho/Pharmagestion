import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright pour les tests End-to-End (E2E) OBASA SECS.
 * Conforme aux exigences d'automatisation CI et recette multi-environnements.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90 * 1000,

  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
    env: {
      ...process.env,
      NEXT_PUBLIC_OBASA_DEMO_MODE: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://unconfigured.local",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "unconfigured-anon-key",
    },
  },
});
