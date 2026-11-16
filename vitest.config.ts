import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    pool: "threads",
    setupFiles: ["./src/test/setup.ts", "./src/test/failOnReactWarnings.ts"],
    restoreMocks: true,
    // Vitest only skips node_modules and .git by default; never run tests
    // copied into build output.
    exclude: [...configDefaults.exclude, "dist/**", "dist-scripts/**"],
  },
});
