import { describe, expect, it } from "vitest";
import type { Rest } from "./rest";
import { type Deps, handleRing } from "./service";
import { generateVapidKeys, toBase64Url } from "./webpush";

const TOKEN = "jeton-de-la-base";
const CREATOR = "11111111-1111-4111-8111-111111111111";
const MESSAGE = "22222222-2222-4222-8222-222222222222";
const SITE = "https://exemple.test/";

/** Un appareil abonné, avec une vraie clé publique : le chiffrement tourne pour de bon. */
async function device(id: string) {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {
    id,
    endpoint: `https://web.push.apple.com/${id}`,
    p256dh: toBase64Url(publicKey),
    auth: toBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  };
}

interface World {
  server: { ring_token: string; public_key: string | null; private_jwk: JsonWebKey | null };
  devices: Array<Awaited<ReturnType<typeof device>>>;
  /** Messages pas encore annoncés, par identifiant. */
  messages: Record<string, { creator_id: string; body: string }>;
  doneToday: string[];
  lastActivity: string | null;
  sent: Set<string>;
  /** Ce que répond le service de notifications, par adresse d'appareil. 201 par défaut. */
  pushStatus: Record<string, number>;
  pushed: string[];
}

async function world(overrides: Partial<World> = {}): Promise<World> {
  const keys = await generateVapidKeys();
  return {
    server: { ring_token: TOKEN, public_key: keys.publicKey, private_jwk: keys.privateJwk },
    devices: [await device("iphone")],
    messages: { [MESSAGE]: { creator_id: CREATOR, body: "Beau reel.\nGarde ce hook." } },
    doneToday: [],
    lastActivity: "2026-11-16T08:00:00Z",
    sent: new Set(),
    pushStatus: {},
    pushed: [],
    ...overrides,
  };
}

/** La base, réduite aux requêtes que fait la fonction. */
function fakeDb(state: World): Rest {
  return {
    async get<Row>(path: string) {
      const table = path.split("?")[0];
      const rows: Record<string, unknown[]> = {
        push_server: [state.server],
        push_devices: state.devices,
        programs: [{ creator_id: CREATOR, forced_phase: null, forced_phase_from: null }],
        day_logs: path.includes("select=done")
          ? [{ done: state.doneToday }]
          : state.lastActivity
            ? [{ updated_at: state.lastActivity }]
            : [],
        follower_stats: [],
        hooks: [],
      };
      return (rows[table ?? ""] ?? []) as Row[];
    },
    async patch<Row>(path: string, changes: object) {
      if (path.startsWith("push_server")) {
        if (state.server.public_key) return [];
        Object.assign(state.server, changes);
        return [state.server] as Row[];
      }
      const id = /id=eq\.([^&]+)/.exec(path)?.[1] ?? "";
      const message = state.messages[id];
      delete state.messages[id];
      return (message ? [message] : []) as Row[];
    },
    async insertIfNew(_table, row) {
      const { kind, day } = row as { kind: string; day: string };
      const key = `${kind} ${day}`;
      if (state.sent.has(key)) return false;
      state.sent.add(key);
      return true;
    },
    async remove(path) {
      const id = /id=eq\.([^&]+)/.exec(path)?.[1];
      state.devices = state.devices.filter((known) => known.id !== id);
    },
  };
}

function deps(state: World, now: string): Deps {
  const fakeFetch = (async (url: string) => {
    state.pushed.push(url);
    return new Response(null, { status: state.pushStatus[url] ?? 201 });
  }) as unknown as typeof fetch;
  return { db: fakeDb(state), fetch: fakeFetch, now: () => new Date(now), subject: SITE };
}

function ring(body: unknown, token: string | null = TOKEN, method = "POST") {
  return new Request("https://projet.supabase.co/functions/v1/push", {
    method,
    headers: token ? { "x-ring-token": token } : {},
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

const MORNING = "2026-11-17T08:00:00+01:00";

describe("qui peut sonner", () => {
  it("refuse un appel sans le jeton de la base, ou avec un mauvais", async () => {
    const state = await world();
    const without = await handleRing(ring({ type: "reminders" }, null), deps(state, MORNING));
    const wrong = await handleRing(ring({ type: "reminders" }, "autre"), deps(state, MORNING));
    expect(without.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(state.pushed).toEqual([]);
  });

  it("refuse une demande qu'elle ne connaît pas", async () => {
    const state = await world();
    const unknown = await handleRing(ring({ type: "autre" }), deps(state, MORNING));
    const badId = await handleRing(ring({ type: "message", id: "1 or 1=1" }), deps(state, MORNING));
    const get = await handleRing(ring(null, TOKEN, "GET"), deps(state, MORNING));
    expect([unknown.status, badId.status, get.status]).toEqual([400, 400, 405]);
    expect(state.pushed).toEqual([]);
  });
});

describe("clés du serveur", () => {
  it("les crée à la première demande et les garde ensuite", async () => {
    const state = await world({
      server: { ring_token: TOKEN, public_key: null, private_jwk: null },
    });
    expect((await handleRing(ring({ type: "setup" }), deps(state, MORNING))).status).toBe(204);
    const created = state.server.public_key;
    expect(created).toMatch(/^[\w-]{87}$/);

    await handleRing(ring({ type: "setup" }), deps(state, MORNING));
    expect(state.server.public_key).toBe(created);
  });
});

describe("nouveau message du coach", () => {
  it("prévient tous les appareils du créateur, une seule fois", async () => {
    const state = await world({ devices: [await device("iphone"), await device("ordinateur")] });

    const first = await handleRing(ring({ type: "message", id: MESSAGE }), deps(state, MORNING));
    expect(first.status).toBe(204);
    expect(state.pushed.sort()).toEqual([
      "https://web.push.apple.com/iphone",
      "https://web.push.apple.com/ordinateur",
    ]);

    // La base sonne une seconde fois pour le même message : plus rien ne part.
    await handleRing(ring({ type: "message", id: MESSAGE }), deps(state, MORNING));
    expect(state.pushed).toHaveLength(2);
  });

  it("oublie un appareil dont l'abonnement n'existe plus", async () => {
    const state = await world({
      devices: [await device("iphone"), await device("ancien")],
      pushStatus: { "https://web.push.apple.com/ancien": 410 },
    });
    await handleRing(ring({ type: "message", id: MESSAGE }), deps(state, MORNING));
    expect(state.devices.map((known) => known.id)).toEqual(["iphone"]);
  });

  it("ne fait rien pour un créateur sans appareil abonné", async () => {
    const state = await world({ devices: [] });
    const response = await handleRing(ring({ type: "message", id: MESSAGE }), deps(state, MORNING));
    expect(response.status).toBe(204);
    expect(state.pushed).toEqual([]);
  });
});

describe("rappels", () => {
  it("envoie le rappel du matin une seule fois dans la journée", async () => {
    const state = await world();
    await handleRing(ring({ type: "reminders" }), deps(state, MORNING));
    await handleRing(ring({ type: "reminders" }), deps(state, "2026-11-17T09:00:00+01:00"));
    expect(state.pushed).toHaveLength(1);
    expect([...state.sent]).toEqual(["matin 2026-11-17"]);
  });

  it("n'envoie le rappel de publication que si la publication n'est pas cochée", async () => {
    const evening = "2026-11-17T18:00:00+01:00";
    const pending = await world();
    await handleRing(ring({ type: "reminders" }), deps(pending, evening));
    expect([...pending.sent]).toEqual(["publication 2026-11-17"]);

    const published = await world({ doneToday: ["post_tue"] });
    await handleRing(ring({ type: "reminders" }), deps(published, evening));
    expect(published.pushed).toEqual([]);
  });

  it("ne lit rien et n'envoie rien en dehors des heures de rappel", async () => {
    const state = await world();
    await handleRing(ring({ type: "reminders" }), deps(state, "2026-11-17T14:00:00+01:00"));
    expect(state.pushed).toEqual([]);
    expect(state.sent.size).toBe(0);
  });
});
