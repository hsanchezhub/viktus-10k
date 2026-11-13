import { expect, type Page, test } from "@playwright/test";
import { onDay, signedIn } from "./support";

const DEMO_STORAGE_KEY = "viktus:demo";
const CACHE_STORAGE_KEY = "viktus:cache";

/** Attend que le service worker ait gardé le site et qu'il pilote la page. */
async function siteKeptOffline(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
  });
}

/** Les tâches du jour que le « serveur » de test a reçues. */
function savedTasks(page: Page, day: string) {
  return page.evaluate(
    ([key, date]) => JSON.parse(localStorage.getItem(key) ?? "{}").tracking?.days?.[date] ?? [],
    [DEMO_STORAGE_KEY, day] as const,
  );
}

test.beforeEach(async ({ page }) => {
  const supported = await page
    .goto("connexion")
    .then(() => page.evaluate(() => "serviceWorker" in navigator));
  test.skip(!supported, "Ce navigateur de test n'a pas de service worker");
});

test("s'ouvre sans réseau, garde les cases cochées et les envoie au retour du réseau", async ({
  page,
  context,
}) => {
  await onDay(page, "2026-11-17");
  await signedIn(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();
  await siteKeptOffline(page);
  // Le suivi affiché est gardé sur l'appareil.
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? "", CACHE_STORAGE_KEY))
    .toContain("tracking");

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toBeVisible();

  // Une autre page du site s'ouvre aussi, directement par son adresse.
  await page.goto("plan");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("./");

  const reel = page.getByRole("checkbox", { name: /Publier le reel Transfo/ });
  await reel.check();
  await expect(reel).toBeChecked();
  expect(await savedTasks(page, "2026-11-17")).toEqual([]);

  // Site fermé puis rouvert, toujours sans réseau : la case est restée cochée.
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? "", CACHE_STORAGE_KEY))
    .toContain("post_tue");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Publier le reel Transfo/ })).toBeChecked();
  expect(await savedTasks(page, "2026-11-17")).toEqual([]);

  await context.setOffline(false);
  await expect.poll(() => savedTasks(page, "2026-11-17")).toEqual(["post_tue"]);
  await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /Publier le reel Transfo/ })).toBeChecked();
});

test("le coach ne peut pas envoyer de message sans réseau, et le sait tout de suite", async ({
  page,
  context,
}) => {
  await onDay(page, "2026-11-17");
  await signedIn(page, "coach");
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Coach" })).toBeVisible();
  await siteKeptOffline(page);

  await context.setOffline(true);
  await expect(page.getByRole("status").filter({ hasText: "Hors ligne" })).toBeVisible();
  await page.getByLabel("Ton retour").fill("Beau reel, garde ce hook.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  // Le backend de test ne passe pas par le réseau : seul compte ici que l'envoi ne reste
  // pas bloqué en attente. Le bouton redevient disponible aussitôt.
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
});
