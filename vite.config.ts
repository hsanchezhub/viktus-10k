import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// BASE_PATH vaut « /viktus-10k/ » sur GitHub Pages et « / » en local.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
