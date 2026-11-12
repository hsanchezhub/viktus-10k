import { defineConfig, devices } from "@playwright/test";

// Les parcours tournent sur le site construit, servi sous /viktus-10k/ comme sur GitHub Pages.
const BASE_PATH = "/viktus-10k/";
const PORT = 4173;
const baseURL = `http://localhost:${PORT}${BASE_PATH}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    // Les parcours utilisent le backend en mémoire : ils ne touchent jamais la vraie base.
    env: { BASE_PATH, VITE_BACKEND: "memory" },
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] } },
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
  ],
});
