import { defineConfig } from "vitest/config";

// Do not load the extension packaging plugin in Node-based unit tests.
export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
