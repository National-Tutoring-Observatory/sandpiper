import { fileURLToPath } from "url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("../..", import.meta.url));

// Checks that need a model server running on this machine, and unit tests for
// these scripts. They are kept out of the main vitest config so CI never tries
// to reach a model.
export default defineConfig({
  root,
  test: {
    include: [
      "scripts/localModels/**/*.check.ts",
      "scripts/localModels/**/*.test.ts",
    ],
    testTimeout: 900_000,
  },
  plugins: [tsconfigPaths({ root })],
});
