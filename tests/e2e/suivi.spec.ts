import { expect, test } from "@playwright/test";
import { horizontalOverflow, onDay, sectionLink, signedIn } from "./support";

test("avant le lancement, annonce la date et propose les premières fois", async ({ page }) => {
  await onDay(page, "2026-11-12");
  await signedIn(page);
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Le plan démarre lundi 16 nov\./,
  );
  await expect(page.getByRole("heading", { name: "Les premières fois" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ta to-do du jour" })).toHaveCount(0);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("affiche la to-do du jour, la coche et s'en souvient", async ({ page }) => {
  await onDay(page, "2026-11-17"); // mardi de la semaine 1
  await signedIn(page);
  await page.goto("./");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Jour 2/);
  await expect(page.getByText("mardi 17 nov. · semaine 1")).toBeVisible();
  await expect(page.getByText("Série : 0 jour")).toBeVisible();

  const todo = page.getByRole("region", { name: "Ta to-do du jour" });
  await expect(todo.getByRole("checkbox")).toHaveCount(5);
  await expect(todo).toContainText("0/5");

  for (const task of [/Filmer le kit 4 plans/, /Publier le reel Transfo/, /3 stories/]) {
    await todo.getByRole("checkbox", { name: task }).check();
  }
  await expect(todo).toContainText("3/5");
  // 3 tâches sur 5 : la journée atteint 60 %, elle compte dans la série.
  await expect(page.getByText("Série : 1 jour")).toBeVisible();

  await page.reload();
  await expect(todo.getByRole("checkbox", { name: /Publier le reel Transfo/ })).toBeChecked();
  await expect(todo).toContainText("3/5");

  await todo.getByRole("checkbox", { name: /Répondre à tous/ }).check();
  await todo.getByRole("checkbox", { name: /Demander aux nouveaux clients/ }).check();
  await expect(todo.getByText("Journée validée. Propre.")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("mène de la tâche à l'écran qui aide à la faire", async ({ page }) => {
  await onDay(page, "2026-11-17");
  await signedIn(page);
  await page.goto("./");

  await page.getByRole("link", { name: "Comment monter" }).click();
  await expect(page).toHaveURL(/\/montage$/);
});

test("coche une première fois depuis Aujourd'hui et la retrouve dans Suivi", async ({ page }) => {
  await onDay(page, "2026-11-17");
  await signedIn(page);
  await page.goto("./");

  const firsts = page.getByRole("region", { name: "Les premières fois" });
  await expect(firsts).toContainText("0/16");
  // Une première fois cochée quitte cette liste : on clique, sans attendre que la case reste là.
  await firsts.getByRole("checkbox", { name: "Refaire le nom de profil et la bio" }).click();
  await expect(firsts).toContainText("1/16");

  await sectionLink(page, "Suivi").click();
  await expect(
    page.getByRole("checkbox", { name: "Refaire le nom de profil et la bio" }),
  ).toBeChecked();
});

test("relève ses abonnés et les place sur la courbe", async ({ page }) => {
  await onDay(page, "2026-11-23"); // lundi : jour du relevé
  await signedIn(page);
  await page.goto("suivi");

  await expect(page.getByText("audit du 12 nov.")).toBeVisible();

  await page.getByLabel("Abonnés", { exact: true }).fill("beaucoup");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("alert")).toContainText("en chiffres");

  await page.getByLabel("Abonnés", { exact: true }).fill("690");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status")).toHaveText("Abonnés enregistrés");
  await expect(page.getByText("relevé du 23 nov.")).toBeVisible();
  // Objectif du 23 novembre : 725. À 690, Victor est 35 sous l'objectif.
  await expect(page.getByText("35 sous l'objectif")).toBeVisible();

  await page.reload();
  await expect(page.getByText("relevé du 23 nov.")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("note un reel dans le carnet, marque le hook gagnant, puis le supprime", async ({ page }) => {
  await onDay(page, "2026-11-22");
  await signedIn(page);
  await page.goto("suivi");

  const journal = page.getByRole("region", { name: "Le carnet des hooks" });
  await expect(journal).toContainText("Le premier reel noté apparaîtra ici");

  await journal.getByRole("button", { name: "Ajouter au carnet" }).click();
  await expect(journal.getByRole("alert")).toContainText("Écris le hook");

  await journal.getByLabel("Type").selectOption("essai");
  await journal.getByLabel("Hook", { exact: true }).fill("Il m'a dit : fais ce que tu veux");
  await journal.getByLabel("Vues à 72 h").fill("7000");
  await journal.getByLabel("Partages").fill("41");
  await journal.getByRole("button", { name: "Ajouter au carnet" }).click();

  const entry = journal.getByRole("listitem").filter({ hasText: "fais ce que tu veux" });
  await expect(entry).toContainText("gagnant");
  await expect(entry).toContainText("essai");
  await expect(entry).toContainText(/7\s000 vues/);

  await entry.getByRole("button", { name: /Supprimer/ }).click();
  await expect(entry).toHaveCount(0);
});
