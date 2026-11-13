import { expect, test } from "@playwright/test";
import { onDay, signedIn, switchTo, TEST_PASSWORD, victor } from "./support";

test("le coach invite son créateur, qui crée ensuite son compte", async ({ page }) => {
  await onDay(page, "2026-11-13");
  await signedIn(page, "coach", {}, { withoutCreator: true });
  await page.goto("./");

  await expect(page.getByRole("heading", { name: "Invite ton créateur" })).toBeVisible();

  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByRole("alert")).toContainText("prénom");

  await page.getByLabel("Son prénom").fill("Victor");
  await page.getByLabel("Son e-mail").fill("pas-une-adresse");
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByRole("alert")).toContainText("n'est pas valide");

  await page.getByLabel("Son e-mail").fill(victor.email);
  await page.getByRole("button", { name: "Inviter" }).click();
  await expect(page.getByRole("heading", { name: "Invitation prête pour Victor" })).toBeVisible();
  await expect(page.getByText(victor.email)).toBeVisible();
  await expect(page.getByText(/\/viktus-10k\/$/)).toBeVisible();

  // Victor ouvre le site à son tour et crée son compte avec l'adresse invitée.
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByRole("button", { name: "Crée ton compte" }).click();
  await page.getByLabel("E-mail").fill(victor.email);
  await page.getByLabel("Mot de passe").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Le plan démarre lundi 16 nov\./,
  );
});

test("le coach écrit, le créateur lit, le coach voit que c'est lu", async ({ page }) => {
  await onDay(page, "2026-11-17");
  await signedIn(page, "coach");
  await page.goto("./");

  const messages = page.getByRole("region", { name: "Tes messages à Victor" });
  await expect(messages).toContainText("Aucun message pour l'instant");

  await messages.getByRole("button", { name: "Envoyer" }).click();
  await expect(messages.getByRole("alert")).toContainText("Écris ton message");

  await messages.getByLabel("Ton retour").fill("Ton reel de mardi est propre. Garde ce rythme.");
  await messages.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("status")).toHaveText("Message envoyé");
  await expect(messages.getByRole("listitem")).toContainText("Garde ce rythme");
  await expect(messages.getByRole("listitem")).toContainText("Pas encore lu");

  await switchTo(page, "creator");
  const word = page.getByRole("region", { name: "Le mot de Hugo" });
  await expect(word).toContainText("Ton reel de mardi est propre");
  await expect(word).toContainText("Nouveau");

  await switchTo(page, "coach");
  await expect(messages.getByRole("listitem")).toContainText("Lu");
  await expect(messages.getByRole("listitem")).not.toContainText("Pas encore lu");

  await messages.getByRole("button", { name: "Supprimer ce message" }).click();
  await expect(messages).toContainText("Aucun message pour l'instant");
});

test("le créateur retrouve l'historique des messages", async ({ page }) => {
  await onDay(page, "2026-11-19");
  await signedIn(
    page,
    "creator",
    {},
    {
      messages: [
        {
          id: "m1",
          body: "Premier retour.",
          createdAt: "2026-11-17T10:00:00Z",
          readAt: "2026-11-17T12:00:00Z",
        },
        {
          id: "m2",
          body: "Deuxième retour.",
          createdAt: "2026-11-18T10:00:00Z",
          readAt: "2026-11-18T12:00:00Z",
        },
      ],
    },
  );
  await page.goto("./");

  const word = page.getByRole("region", { name: "Le mot de Hugo" });
  await expect(word).toContainText("Deuxième retour.");
  await expect(word).not.toContainText("Nouveau");

  await word.getByRole("button", { name: "Tous les messages (2)" }).click();
  const history = page.getByRole("dialog", { name: "Messages de Hugo" });
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history).toContainText("Premier retour.");
});

test("le tableau de bord du coach résume la semaine du créateur", async ({ page }) => {
  await onDay(page, "2026-11-18"); // mercredi de la semaine 1
  await signedIn(page, "coach", {
    // Lundi fait en entier, mardi 3 tâches sur 5, rien encore mercredi.
    days: {
      "2026-11-16": ["followers", "story_mon"],
      "2026-11-17": ["kit", "post_tue", "stories"],
    },
    firsts: { f_bio: "2026-11-14" },
    followers: { "2026-11-16": 652 },
  });
  await page.goto("./");

  const figures = page.locator("dl").first();
  await expect(figures).toContainText("jours de série");
  // 5 tâches faites sur 11 prévues depuis lundi : 45 %.
  await expect(figures).toContainText("45 %");
  await expect(figures).toContainText("5 sur 11");
  await expect(figures).toContainText("1/4"); // un reel publié sur les 4 publications de la semaine
  await expect(figures).toContainText("1/16");
  // Objectif au 16 novembre : 674. À 652, il est en dessous.
  await expect(figures).toContainText(/objectif à cette date : 674/);
  await expect(page.getByRole("listitem", { name: /mardi 17 nov\., 60 % fait/ })).toBeVisible();
});

test("la phase forcée par le coach change la to-do du créateur dès ce jour-là", async ({
  page,
}) => {
  await onDay(page, "2026-11-20"); // vendredi de la semaine 1, en phase 1 d'après le calendrier
  await signedIn(page, "coach");
  await page.goto("./");

  await expect(page.getByText("Phase 1, d'après le calendrier.")).toBeVisible();
  await page.getByLabel("Phase", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status")).toHaveText("Phase enregistrée");
  await expect(page.getByText("Phase 2 forcée depuis le 20 nov.")).toBeVisible();

  await switchTo(page, "creator");
  // En phase 2, le vendredi gagne un réel d'essai.
  await expect(page.getByRole("checkbox", { name: /Publier un réel d'essai/ })).toBeVisible();
  await expect(page.getByText("Phase 2 · Le rythme")).toBeVisible();
});

test("avant le lancement, le coach voit la date de démarrage à la place de la to-do", async ({
  page,
}) => {
  await onDay(page, "2026-11-13");
  await signedIn(page, "coach");
  await page.goto("./");

  await expect(page.getByText("Démarrage lundi 16 nov. : rien à cocher d'ici là.")).toBeVisible();
  await expect(page.getByText("nov..")).toHaveCount(0);
});
