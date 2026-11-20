import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the critical path. They need the full stack running
 * (PostgreSQL + API + frontend), e.g. `docker compose up`, then:
 *   pnpm test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "off",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
