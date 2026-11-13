import { describe, expect, it } from "vitest";
import {
  encryptPayload,
  fromBase64Url,
  generateVapidKeys,
  type PushTarget,
  sendPush,
  toBase64Url,
  vapidAuthorization,
} from "./webpush";

const CURVE = { name: "ECDH", namedCurve: "P-256" } as const;
const text = new TextEncoder();

async function hkdf(salt: Uint8Array, secret: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", secret as BufferSource, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Un appareil de test : il s'abonne, puis déchiffre ce qu'il reçoit comme le ferait un navigateur. */
async function createDevice() {
  const pair = await crypto.subtle.generateKey(CURVE, true, ["deriveBits"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const target: PushTarget = {
    endpoint: "https://web.push.apple.com/abonnement-de-test",
    p256dh: toBase64Url(publicKey),
    auth: toBase64Url(authSecret),
  };

  async function decrypt(body: Uint8Array): Promise<string> {
    const salt = body.slice(0, 16);
    const keyLength = body[20] ?? 0;
    const senderPublic = body.slice(21, 21 + keyLength);
    const ciphertext = body.slice(21 + keyLength);

    const senderKey = await crypto.subtle.importKey("raw", senderPublic, CURVE, false, []);
    const shared = new Uint8Array(
      await crypto.subtle.deriveBits({ name: "ECDH", public: senderKey }, pair.privateKey, 256),
    );
    const info = new Uint8Array([...text.encode("WebPush: info\0"), ...publicKey, ...senderPublic]);
    const inputKey = await hkdf(authSecret, shared, info, 32);
    const contentKey = await hkdf(salt, inputKey, text.encode("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, inputKey, text.encode("Content-Encoding: nonce\0"), 12);
    const aesKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["decrypt"]);
    const padded = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aesKey, ciphertext),
    );
    // Le dernier octet (0x02) marque la fin du message.
    expect(padded.at(-1)).toBe(2);
    return new TextDecoder().decode(padded.slice(0, -1));
  }

  return { target, decrypt };
}

describe("encryptPayload", () => {
  it("chiffre un message que seul l'appareil abonné peut relire", async () => {
    const device = await createDevice();
    const message = "Nouveau message de ton coach : beau reel, garde ce hook.";

    const body = await encryptPayload(device.target, text.encode(message));

    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(body[20]).toBe(65);
    expect(await device.decrypt(body)).toBe(message);
  });

  it("ne produit jamais deux fois le même chiffré", async () => {
    const device = await createDevice();
    const first = await encryptPayload(device.target, text.encode("même message"));
    const second = await encryptPayload(device.target, text.encode("même message"));
    expect(toBase64Url(first)).not.toBe(toBase64Url(second));
  });

  it("refuse une clé d'appareil qui n'en est pas une", async () => {
    const target = { endpoint: "https://web.push.apple.com/x", p256dh: "AAAA", auth: "AAAA" };
    await expect(encryptPayload(target, text.encode("x"))).rejects.toThrow();
  });
});

describe("vapidAuthorization", () => {
  it("signe un jeton que la clé publique du serveur permet de vérifier", async () => {
    const keys = await generateVapidKeys();
    const now = new Date("2026-11-16T07:00:00Z");

    const header = await vapidAuthorization(
      "https://web.push.apple.com/abonnement",
      keys,
      "https://exemple.test/",
      now,
    );

    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
    if (!match) throw new Error(`En-tête inattendu : ${header}`);
    const [, head = "", claims = "", signature = "", publicKey = ""] = match;
    expect(publicKey).toBe(keys.publicKey);
    expect(fromBase64Url(publicKey)).toHaveLength(65);
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(head)))).toEqual({
      typ: "JWT",
      alg: "ES256",
    });
    expect(JSON.parse(new TextDecoder().decode(fromBase64Url(claims)))).toEqual({
      aud: "https://web.push.apple.com",
      exp: now.getTime() / 1000 + 12 * 3600,
      sub: "https://exemple.test/",
    });

    const verifyKey = await crypto.subtle.importKey(
      "raw",
      fromBase64Url(publicKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      fromBase64Url(signature),
      text.encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});

describe("sendPush", () => {
  async function send(status: number | "panne") {
    const device = await createDevice();
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      if (status === "panne") throw new Error("réseau coupé");
      return new Response(null, { status });
    }) as unknown as typeof fetch;

    const outcome = await sendPush(
      device.target,
      { title: "Ta to-do du jour", body: "5 tâches" },
      {
        keys: await generateVapidKeys(),
        subject: "https://exemple.test/",
        ttl: 3600,
        now: new Date("2026-11-17T07:00:00Z"),
        fetch: fakeFetch,
      },
    );
    return { outcome, requests, device };
  }

  it("envoie le message chiffré à l'adresse de l'appareil", async () => {
    const { outcome, requests, device } = await send(201);
    expect(outcome).toBe("sent");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(device.target.endpoint);
    const headers = requests[0]?.init.headers as Record<string, string>;
    expect(headers["Content-Encoding"]).toBe("aes128gcm");
    expect(headers.TTL).toBe("3600");
    expect(headers.Authorization).toMatch(/^vapid t=/);
    expect(JSON.parse(await device.decrypt(requests[0]?.init.body as Uint8Array))).toEqual({
      title: "Ta to-do du jour",
      body: "5 tâches",
    });
  });

  it("signale un abonnement disparu, pour qu'il soit oublié", async () => {
    expect((await send(410)).outcome).toBe("gone");
    expect((await send(404)).outcome).toBe("gone");
  });

  it("ne lève pas d'erreur quand l'envoi échoue", async () => {
    expect((await send(500)).outcome).toBe("failed");
    expect((await send("panne")).outcome).toBe("failed");
  });
});
