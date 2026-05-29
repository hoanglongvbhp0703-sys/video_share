import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  globalSetup: path.resolve("tests/api/global-setup.ts"),
  testDir: "tests/api",
  timeout: 15000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: { "Content-Type": "application/json" },
  },

  // Reuse dev server if already running; start it otherwise.
  webServer: {
    command: "cross-env NODE_ENV=development tsx server/_core/index.ts",
    url: "http://localhost:3000/api/trpc/auth.me",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
