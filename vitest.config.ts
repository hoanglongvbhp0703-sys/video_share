import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // Bao gồm unit tests nhưng loại trừ Playwright API tests (tests/api/)
    include: [
      "server/**/*.test.ts",
      "client/**/*.test.ts",
      "tests/unit/**/*.test.ts",
    ],
    exclude: ["tests/api/**", "node_modules/**"],
    pool: "forks",
  },
});
