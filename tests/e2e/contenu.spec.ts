import { expect, test } from "@playwright/test";
import { horizontalOverflow, onDay, sectionLink, signedIn } from "./support";

// Les adresses sont relatives : elles s'ajoutent au préfixe /viktus-10k/ défini dans la config.

test.beforeEach(async ({ page }) => {
  await onDay(page, "2026-11-17");
  await signedIn(page);
});

test("affiche le plan, avec la phase en cours et les chiffres de l'audit", async ({ page }) => {
  await page.goto("plan");

  await expect(page.getByRole("heading", { level: 1, name: "Le game plan" })).toBeVisible();
  // La phase s'affiche dans la barre du haut (téléphone) ou dans le rail (ordinateur).
  await expect(
    page
      .getByText(/Phase 1/)
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  // Les chiffres défilent puis s'arrêtent sur la valeur de l'audit.
  await expect(page.getByText(/^645$/)).toBeVisible();
  await expect(page.getByText(/^2\s530$/)).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "En cours" })).toContainText(
    "Le redémarrage",
  );
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("passe d'un écran à l'autre par les onglets", async ({ page }) => {
  await page.goto("./");

  await sectionLink(page, "Idées").click();
  await expect(page).toHaveURL(/\/idees$/);
  await expect(page.getByRole("heading", { level: 1, name: "Les idées" })).toBeVisible();
  await expect(sectionLink(page, "Idées")).toHaveAttribute("aria-current", "page");
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await sectionLink(page, "Montage").click();
  await expect(page).toHaveURL(/\/montage$/);
  await expect(page.getByRole("heading", { level: 1, name: "Claude, ton monteur" })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

  await sectionLink(page, "Aujourd'hui").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Jour 2/);
});

test("filtre les idées par but et garde le filtre au rechargement", async ({ page }) => {
  await page.goto("idees");
  const cards = page.getByRole("article");
  const filters = page.getByRole("group", { name: "Filtrer par but" });

  await expect(cards).toHaveCount(21);

  await filters.getByRole("button", { name: "Émotion" }).click();
  await expect(cards).toHaveCount(5);
  await expect(page).toHaveURL(/but=emo/);

  await filters.getByRole("button", { name: "Réel d'essai" }).click();
  await expect(cards).toHaveCount(8);
  await expect(cards.first()).toContainText("Carte blanche");

  await page.reload();
  await expect(cards).toHaveCount(8);
  await expect(filters.getByRole("button", { name: "Réel d'essai" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("copie un prompt de montage", async ({ page, context, browserName }) => {
  // WebKit ne donne pas accès au presse-papiers en mode automatisé : le retour est vérifié sur Chromium.
  test.skip(
    browserName !== "chromium",
    "Lecture du presse-papiers disponible sur Chromium seulement",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("montage");

  const prompts = page.getByRole("region", { name: "Les prompts à copier" }).getByRole("article");
  await expect(prompts).toHaveCount(6);

  await prompts.first().getByRole("button", { name: "Copier" }).click();
  await expect(page.getByRole("status")).toHaveText("Copié");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Les rushes d'une transfo sont dans le dossier rushes");
});

test("change de thème depuis les réglages et s'en souvient", async ({ page }) => {
  await page.goto("plan");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Réglages" }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await settings.getByRole("button", { name: "Passer au thème clair" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("explique comment mettre le site sur l'écran d'accueil", async ({ page }) => {
  await page.goto("plan");

  await page.getByRole("button", { name: "Réglages" }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await expect(settings).toContainText("Sur ton écran d'accueil");
  await expect(settings).toContainText("iPhone (Safari)");

  await settings.getByRole("button", { name: "Fermer" }).click();
  await expect(settings).toBeHidden();
});

test("signale une adresse inconnue et ramène à l'accueil", async ({ page }) => {
  await page.goto("nimporte-quoi");
  await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();

  await page.getByRole("link", { name: "Revenir à l'accueil" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Jour 2/);
});

test("affiche les chiffres sans animation quand le mouvement est réduit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("plan");
  await expect(page.getByText(/^645$/)).toBeVisible();
  await expect(page.getByRole("progressbar").first()).toBeVisible();
});
