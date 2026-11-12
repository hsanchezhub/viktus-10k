import { expect, test } from "@playwright/test";
import { onDay, signedIn, TEST_PASSWORD, victor } from "./support";

test("demande de se connecter avant d'afficher le site", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();

  await page.goto("suivi");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("refuse une adresse non invitée et un mot de passe trop court", async ({ page }) => {
  await page.goto("connexion");
  await page.getByRole("button", { name: "Crée ton compte" }).click();

  await page.getByLabel("E-mail").fill("inconnu@demo.test");
  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("alert")).toContainText("n'est pas invitée");

  await page.getByLabel("E-mail").fill(victor.email);
  await page.getByLabel("Mot de passe").fill("court");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // Le navigateur bloque lui-même un mot de passe sous 8 caractères : on reste sur la page.
  await expect(page).toHaveURL(/\/connexion$/);
});

test("crée le compte d'une adresse invitée, se déconnecte, se reconnecte", async ({ page }) => {
  await onDay(page, "2026-11-17");
  await page.goto("connexion");

  await page.getByRole("button", { name: "Crée ton compte" }).click();
  await page.getByLabel("E-mail").fill(victor.email);
  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();

  await page.getByRole("button", { name: "Réglages" }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await expect(settings).toContainText("Victor");
  await expect(settings).toContainText(victor.email);
  await settings.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);

  await page.getByLabel("E-mail").fill(victor.email);
  await page.getByLabel("Mot de passe").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");

  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();
});

test("le coach lit le suivi du créateur sans pouvoir le modifier", async ({ page }) => {
  await onDay(page, "2026-11-17");
  await signedIn(page, "coach", { days: { "2026-11-17": ["kit"] } });
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1, name: "Coach" })).toBeVisible();
  const kit = page.getByRole("checkbox", { name: /Filmer le kit 4 plans/ });
  await expect(kit).toBeChecked();
  await expect(kit).toBeDisabled();

  await page.goto("suivi");
  await expect(page.getByRole("heading", { level: 1, name: "Le suivi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter au carnet" })).toHaveCount(0);
});
