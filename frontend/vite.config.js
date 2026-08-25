import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // This project keeps a single shared .env at the repo root (one file for
  // both the backend and VITE_-prefixed frontend vars — see .env.example).
  // Vite's default envDir is its own project root (frontend/), which would
  // silently miss that file entirely; point it one level up instead.
  envDir: path.resolve(__dirname, ".."),
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
});
