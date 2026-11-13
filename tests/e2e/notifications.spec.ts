import { expect, type Page, test } from "@playwright/test";
import { onDay, signedIn } from "./support";

const DEMO_STORAGE_KEY = "viktus:demo";
const NUDGE = /Ne rate aucun message de Hugo/;

/**
 * Remplace les notifications du navigateur par un faux, qui répond `answer` à la demande
 * d'autorisation. Les navigateurs de test n'ont pas de vrai service de notifications.
 */
async function fakePush(page: Page, answer: "granted" | "denied") {
  await page.addInitScript((permission) => {
    let current: NotificationPermission = "default";
    let subscription: object | null = null;

    const fakeSubscription = (key: BufferSource) => ({
      endpoint: "https://web.push.apple.com/appareil-de-test",
      options: { applicationServerKey: key },
      toJSON: () => ({
        endpoint: "https://web.push.apple.com/appareil-de-test",
        keys: { p256dh: "cle-publique-de-test", auth: "secret-de-test" },
      }),
      unsubscribe: async () => {
        subscription = null;
        return true;
      },
    });

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return current;
        },
        requestPermission: async () => (current = permission),
      },
    });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
    Object.defineProperty(ServiceWorkerRegistration.prototype, "pushManager", {
      configurable: true,
      get: () => ({
        getSubscription: async () => subscription,
        subscribe: async ({ applicationServerKey }: { applicationServerKey: BufferSource }) =>
          (subscription = fakeSubscription(applicationServerKey)),
      }),
    });
  }, answer);
}

/** Les appareils abonnés que le « serveur » de test connaît. */
function subscribedDevices(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}").pushDevices ?? [],
    DEMO_STORAGE_KEY,
  );
}

test.beforeEach(async ({ page }) => {
  const supported = await page
    .goto("connexion")
    .then(() => page.evaluate(() => "serviceWorker" in navigator));
  test.skip(!supported, "Ce navigateur de test n'a pas de service worker");
  await onDay(page, "2026-11-17");
});

test("le créateur active les notifications depuis Aujourd'hui, puis les coupe dans les réglages", async ({
  page,
}) => {
  await fakePush(page, "granted");
  await signedIn(page);
  await page.goto("./");

  const nudge = page.getByRole("region", { name: NUDGE });
  await nudge.getByRole("button", { name: "Activer" }).click();
  await expect(nudge).toHaveCount(0);
  expect(await subscribedDevices(page)).toEqual(["https://web.push.apple.com/appareil-de-test"]);

  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await expect(settings).toContainText("Activées sur cet appareil");
  await settings.getByRole("button", { name: "Couper les notifications" }).click();
  await expect(settings.getByRole("button", { name: "Activer les notifications" })).toBeVisible();
  expect(await subscribedDevices(page)).toEqual([]);
});

test("un refus est expliqué, et les réglages disent comment revenir dessus", async ({ page }) => {
  await fakePush(page, "denied");
  await signedIn(page);
  await page.goto("./");

  const nudge = page.getByRole("region", { name: NUDGE });
  await nudge.getByRole("button", { name: "Activer" }).click();
  await expect(nudge.getByRole("alert")).toContainText("Tu n'as pas autorisé les notifications");
  expect(await subscribedDevices(page)).toEqual([]);
  await nudge.getByRole("button", { name: "Compris" }).click();
  await expect(nudge).toHaveCount(0);

  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog", { name: "Réglages" })).toContainText(
    "Les notifications sont bloquées pour ce site",
  );
});

test("« Plus tard » range l'invitation, qui ne revient pas à la visite suivante", async ({
  page,
}) => {
  await fakePush(page, "granted");
  await signedIn(page);
  await page.goto("./");

  const nudge = page.getByRole("region", { name: NUDGE });
  await nudge.getByRole("button", { name: "Plus tard" }).click();
  await expect(nudge).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();
  await expect(nudge).toHaveCount(0);
  // Le bouton reste disponible dans les réglages.
  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  await expect(page.getByRole("button", { name: "Activer les notifications" })).toBeVisible();
});

test("se déconnecter retire l'appareil des notifications du compte", async ({ page }) => {
  await fakePush(page, "granted");
  await signedIn(page);
  await page.goto("./");
  await page.getByRole("region", { name: NUDGE }).getByRole("button", { name: "Activer" }).click();
  await expect.poll(() => subscribedDevices(page)).toHaveLength(1);

  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  expect(await subscribedDevices(page)).toEqual([]);
});

test("sur iPhone hors écran d'accueil, explique qu'il faut d'abord y poser le site", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Parcours propre à l'iPhone");
  // Comme dans le vrai Safari d'iPhone : pas de notifications tant que le site n'est pas installé.
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "PushManager");
  });
  await signedIn(page);
  await page.goto("./");

  const nudge = page.getByRole("region", { name: NUDGE });
  await expect(nudge).toContainText("Pose d'abord le site sur ton écran d'accueil");
  await expect(nudge.getByRole("button", { name: "Activer" })).toHaveCount(0);

  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  await expect(page.getByRole("dialog", { name: "Réglages" })).toContainText(
    "Sur iPhone, pose d'abord le site sur ton écran d'accueil",
  );
});

test("le coach n'a ni invitation ni réglage de notifications", async ({ page }) => {
  await fakePush(page, "granted");
  await signedIn(page, "coach");
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: "Coach" })).toBeVisible();
  await expect(page.getByRole("region", { name: NUDGE })).toHaveCount(0);

  await page.getByRole("button", { name: "Réglages" }).filter({ visible: true }).click();
  const settings = page.getByRole("dialog", { name: "Réglages" });
  await expect(settings).toContainText("Coach");
  await expect(settings).not.toContainText("Notifications");
});

// L'affichage de la notification elle-même ne se vérifie pas ici : un navigateur de test sans
// écran ne les garde pas. Il se vérifie sur un vrai téléphone.
test("le service worker reçoit une notification et prévient le site ouvert", async ({
  page,
  context,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== "chromium", "La livraison d'un message de test passe par Chromium");
  await context.grantPermissions(["notifications"]);
  await signedIn(page, "creator", {}, { messages: [] });
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1, name: /Jour 2/ })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Le site doit relire ses messages quand le service worker annonce une notification.
  await page.evaluate(() => {
    const announced = new Promise((resolve) =>
      navigator.serviceWorker.addEventListener("message", (event) => resolve(event.data), {
        once: true,
      }),
    );
    Object.assign(window, { announced });
  });

  const devtools = await context.newCDPSession(page);
  const registered = new Promise<string>((resolve) =>
    devtools.on("ServiceWorker.workerRegistrationUpdated", ({ registrations }) => {
      const found = registrations.find((registration) => registration.scopeURL === baseURL);
      if (found) resolve(found.registrationId);
    }),
  );
  await devtools.send("ServiceWorker.enable");
  await devtools.send("ServiceWorker.deliverPushMessage", {
    origin: new URL(baseURL ?? "").origin,
    registrationId: await registered,
    data: JSON.stringify({
      title: "Nouveau message de ton coach",
      body: "Beau reel, garde ce hook.",
      tag: "message-test",
      url: "./",
    }),
  });

  expect(
    await page.evaluate(() => (window as unknown as { announced: unknown }).announced),
  ).toEqual({ source: "viktus", kind: "push" });
});
