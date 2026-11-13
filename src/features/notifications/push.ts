import type { PushDevice } from "../../data/backend";
import { isOnHomeScreen } from "../install/useInstall";

/**
 * Les notifications de cet appareil, vues du navigateur : ce qu'il sait faire, l'abonnement
 * en cours, comment s'abonner et se désabonner. Rien ici ne parle au serveur du site.
 */

export type PushStatus =
  /** Ce navigateur ne sait pas recevoir de notifications. */
  | "unsupported"
  /** iPhone : il faut d'abord poser le site sur l'écran d'accueil. */
  | "needs-install"
  /** L'utilisateur a refusé les notifications pour ce site. */
  | "blocked"
  | "off"
  | "on";

function isIos(): boolean {
  // Un iPad récent se présente comme un Mac : on le reconnaît à son écran tactile.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function hasPushApi(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Le service worker du site, une fois actif. null s'il n'est pas installé (en développement). */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  const found = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  return found ? navigator.serviceWorker.ready : null;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await activeRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

function toDevice(subscription: PushSubscription): PushDevice {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error("Abonnement incomplet renvoyé par le navigateur");
  }
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function sameBytes(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, index) => byte === b[index]);
}

export async function readPushStatus(): Promise<PushStatus> {
  if (!hasPushApi()) return isIos() && !isOnHomeScreen() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/** L'abonnement de cet appareil, s'il en a un. */
export async function currentDevice(): Promise<PushDevice | null> {
  if (!hasPushApi()) return null;
  const subscription = await currentSubscription();
  return subscription ? toDevice(subscription) : null;
}

/**
 * Demande l'autorisation. À appeler directement dans le geste de l'utilisateur (un bouton) :
 * Safari refuse la demande si autre chose s'est passé entre-temps.
 */
export async function askPermission(): Promise<boolean> {
  return (await Notification.requestPermission()) === "granted";
}

/** Abonne cet appareil auprès du service de notifications du navigateur. */
export async function subscribeDevice(serverKey: string): Promise<PushDevice> {
  const registration = await activeRegistration();
  if (!registration) throw new Error("Service worker absent");

  const key = fromBase64Url(serverKey);
  const existing = await registration.pushManager.getSubscription();
  // Un abonnement pris avec une autre clé de serveur ne recevrait plus rien : on le refait.
  if (existing && !sameBytes(existing.options.applicationServerKey, key)) {
    await existing.unsubscribe();
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  return toDevice(subscription);
}

/** Désabonne cet appareil. Renvoie l'adresse de l'abonnement supprimé, s'il y en avait un. */
export async function unsubscribeDevice(): Promise<string | null> {
  if (!hasPushApi()) return null;
  const subscription = await currentSubscription();
  if (!subscription) return null;
  await subscription.unsubscribe();
  return subscription.endpoint;
}
