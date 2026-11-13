/**
 * Envoi d'une notification Web Push, avec les seuls outils de chiffrement du langage
 * (WebCrypto) : le même code tourne dans la fonction Supabase et dans les tests.
 * Chiffrement du message : RFC 8291 (aes128gcm). Identification du serveur : RFC 8292 (VAPID).
 */

/** L'abonnement d'un appareil, tel que son navigateur l'a fourni. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Les clés du serveur d'envoi. La clé publique est celle que les navigateurs reçoivent. */
export interface VapidKeys {
  publicKey: string;
  privateJwk: JsonWebKey;
}

export type PushOutcome =
  | "sent"
  /** L'abonnement n'existe plus chez le service de notifications : à oublier. */
  | "gone"
  | "failed";

const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const SIGNING = { name: "ECDSA", namedCurve: "P-256" } as const;
const RECORD_SIZE = 4096;
const PUBLIC_KEY_LENGTH = 65;
const VAPID_LIFETIME_S = 12 * 3600;

type Bytes = Uint8Array<ArrayBuffer>;
const encoder = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(text: string): Bytes {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Bytes, secret: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Crée la paire de clés du serveur. À faire une seule fois : en changer désabonne tout le monde. */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey(SIGNING, true, ["sign", "verify"]);
  const [publicRaw, privateJwk] = await Promise.all([
    crypto.subtle.exportKey("raw", pair.publicKey),
    crypto.subtle.exportKey("jwk", pair.privateKey),
  ]);
  return { publicKey: toBase64Url(new Uint8Array(publicRaw)), privateJwk };
}

/** Chiffre un message pour un appareil : lui seul peut le lire. */
export async function encryptPayload(target: PushTarget, plaintext: Uint8Array): Promise<Bytes> {
  const devicePublic = fromBase64Url(target.p256dh);
  const authSecret = fromBase64Url(target.auth);
  if (devicePublic.length !== PUBLIC_KEY_LENGTH) throw new Error("Clé de l'appareil invalide");

  // Une paire de clés jetable par message, comme le demande la norme.
  const sender = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey("raw", sender.publicKey));
  const deviceKey = await crypto.subtle.importKey("raw", devicePublic, CURVE, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: deviceKey }, sender.privateKey, 256),
  );

  const keyInfo = concat(encoder.encode("WebPush: info\0"), devicePublic, senderPublic);
  const inputKey = await hkdf(authSecret, shared, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentKey = await hkdf(
    salt,
    inputKey,
    encoder.encode("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(salt, inputKey, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["encrypt"]);
  // 0x02 marque la fin du message dans le dernier (et ici seul) bloc.
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      concat(plaintext, new Uint8Array([2])),
    ),
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, RECORD_SIZE);
  return concat(salt, recordSize, new Uint8Array([senderPublic.length]), senderPublic, ciphertext);
}

/** L'en-tête qui prouve au service de notifications que le message vient bien de ce serveur. */
export async function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  subject: string,
  now: Date,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(now.getTime() / 1000) + VAPID_LIFETIME_S,
    sub: subject,
  };
  const encode = (value: object) => toBase64Url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${encode(header)}.${encode(claims)}`;

  const key = await crypto.subtle.importKey("jwk", keys.privateJwk, SIGNING, false, ["sign"]);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsigned),
  );
  return `vapid t=${unsigned}.${toBase64Url(new Uint8Array(signature))}, k=${keys.publicKey}`;
}

export interface SendOptions {
  keys: VapidKeys;
  /** Contact du serveur exigé par la norme : une adresse https ou mailto. */
  subject: string;
  /** Durée pendant laquelle le service garde le message si l'appareil est éteint, en secondes. */
  ttl: number;
  now: Date;
  fetch: typeof fetch;
}

/** Envoie un message à un appareil. Ne lève pas d'erreur : le résultat dit ce qu'il s'est passé. */
export async function sendPush(
  target: PushTarget,
  message: object,
  options: SendOptions,
): Promise<PushOutcome> {
  try {
    const body = await encryptPayload(target, encoder.encode(JSON.stringify(message)));
    const response = await options.fetch(target.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthorization(
          target.endpoint,
          options.keys,
          options.subject,
          options.now,
        ),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(options.ttl),
        Urgency: "normal",
      },
      body,
    });
    if (response.status === 404 || response.status === 410) return "gone";
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
