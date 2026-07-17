import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: true, env: { AUTH_SECRET: "playwright-only-secret-at-least-32-characters", DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/homelingua_test" } }
});
