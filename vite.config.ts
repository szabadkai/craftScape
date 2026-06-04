import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project is served from GitHub Pages at https://<user>.github.io/craftScape/
// so assets must resolve under that sub-path. Override with VITE_BASE if needed.
const base = process.env.VITE_BASE ?? "/craftScape/";

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // Logic-bearing modules must be covered. UI shell and bootstrap are
      // exercised by e2e (Playwright) in later phases, not unit coverage.
      include: ["src/core/**", "src/geometry/**", "src/svg/**"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
