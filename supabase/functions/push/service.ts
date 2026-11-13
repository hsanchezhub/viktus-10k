import { type IsoDate, todayInParis } from "../../../src/domain/dates";
import type { PhaseOverride } from "../../../src/domain/phases";
import { dueReminders, isReminderHour } from "./reminders";
import type { Rest } from "./rest";
import { generateVapidKeys, type PushTarget, sendPush, type VapidKeys } from "./webpush";

/**
 * La fonction « push » : la base la sonne (un nouveau message du coach, ou l'horloge de
 * chaque heure) et elle envoie les notifications dues. Elle ne renvoie jamais de données
 * et ne fait confiance à rien de ce qu'on lui dit, sauf au jeton que seule la base connaît.
 */

export interface Deps {
  db: Rest;
  fetch: typeof fetch;
  now: () => Date;
  /** Contact du serveur d'envoi, exigé par les services de notifications. */
  subject: string;
}

/** Ce qu'une notification affiche. Lu par le service worker du site. */
interface Notice {
  title: string;
  body: string;
  /** Deux notifications de même étiquette se remplacent au lieu de s'empiler. */
  tag: string;
  url: string;
}

interface ServerRow {
  ring_token: string;
  public_key: string | null;
  private_jwk: JsonWebKey | null;
}

interface DeviceRow extends PushTarget {
  id: string;
}

interface ProgramRow {
  creator_id: string;
  forced_phase: number | null;
  forced_phase_from: IsoDate | null;
}

const TOKEN_HEADER = "x-ring-token";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGE_TTL_S = 24 * 3600;
/** Un rappel périmé n'a plus d'intérêt : s'il n'a pas pu être remis en 3 heures, il est abandonné. */
const REMINDER_TTL_S = 3 * 3600;
const EXCERPT_LENGTH = 140;
const HOME = "./";

const reply = (status: number) => new Response(null, { status });

/** Compare deux textes sans s'arrêter au premier caractère différent. */
function sameToken(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…` : flat;
}

async function readServer(db: Rest): Promise<ServerRow | undefined> {
  const [server] = await db.get<ServerRow>("push_server?select=ring_token,public_key,private_jwk");
  return server;
}

/**
 * Les clés du serveur d'envoi. Elles sont créées au premier besoin, ne quittent pas la base,
 * et sont retenues sur `server` pour la suite de l'appel.
 */
async function vapidKeys(db: Rest, server: ServerRow): Promise<VapidKeys> {
  if (!server.public_key || !server.private_jwk) {
    const fresh = await generateVapidKeys();
    // Si deux appels créent des clés en même temps, seul le premier les enregistre.
    const [saved] = await db.patch<ServerRow>(
      "push_server?public_key=is.null&select=ring_token,public_key,private_jwk",
      { public_key: fresh.publicKey, private_jwk: fresh.privateJwk },
    );
    const current = saved ?? (await readServer(db));
    server.public_key = current?.public_key ?? null;
    server.private_jwk = current?.private_jwk ?? null;
  }
  if (!server.public_key || !server.private_jwk) {
    throw new Error("Clés du serveur d'envoi introuvables");
  }
  return { publicKey: server.public_key, privateJwk: server.private_jwk };
}

/** Envoie une notification à tous les appareils d'un compte, et oublie ceux qui n'existent plus. */
async function notify(
  deps: Deps,
  server: ServerRow,
  devices: readonly DeviceRow[],
  notice: Notice,
  ttl: number,
): Promise<void> {
  const keys = await vapidKeys(deps.db, server);
  await Promise.all(
    devices.map(async (device) => {
      const outcome = await sendPush(device, notice, {
        keys,
        subject: deps.subject,
        ttl,
        now: deps.now(),
        fetch: deps.fetch,
      });
      if (outcome === "gone") await deps.db.remove(`push_devices?id=eq.${device.id}`);
    }),
  );
}

function devicesOf(db: Rest, userId: string): Promise<DeviceRow[]> {
  return db.get<DeviceRow>(`push_devices?user_id=eq.${userId}&select=id,endpoint,p256dh,auth`);
}

/** Un message du coach vient d'être écrit : son créateur est prévenu, une seule fois. */
async function announceMessage(deps: Deps, server: ServerRow, messageId: string): Promise<void> {
  // Marquer le message comme annoncé le réserve : un second appel ne trouve plus rien à faire.
  const [message] = await deps.db.patch<{ creator_id: string; body: string }>(
    `coach_messages?id=eq.${messageId}&notified_at=is.null&select=creator_id,body`,
    { notified_at: deps.now().toISOString() },
  );
  if (!message) return;

  const devices = await devicesOf(deps.db, message.creator_id);
  if (devices.length === 0) return;
  await notify(
    deps,
    server,
    devices,
    {
      title: "Nouveau message de ton coach",
      body: excerpt(message.body),
      tag: `message-${messageId}`,
      url: HOME,
    },
    MESSAGE_TTL_S,
  );
}

/** Le jour, à Paris, de la dernière saisie du créateur. null s'il n'a encore rien saisi. */
async function lastActivityDay(db: Rest, creatorId: string): Promise<IsoDate | null> {
  const latest = (table: string, column: string) =>
    db.get<Record<string, string>>(
      `${table}?creator_id=eq.${creatorId}&select=${column}&order=${column}.desc&limit=1`,
    );
  const [days, followers, hooks] = await Promise.all([
    latest("day_logs", "updated_at"),
    latest("follower_stats", "updated_at"),
    latest("hooks", "created_at"),
  ]);
  const stamps = [days[0]?.updated_at, followers[0]?.updated_at, hooks[0]?.created_at].filter(
    (stamp): stamp is string => stamp !== undefined,
  );
  const last = stamps.sort().at(-1);
  return last ? todayInParis(new Date(last)) : null;
}

function overrideOf(program: ProgramRow): PhaseOverride | null {
  return program.forced_phase !== null && program.forced_phase_from !== null
    ? { phase: program.forced_phase, from: program.forced_phase_from }
    : null;
}

/** L'horloge a sonné : chaque créateur reçoit les rappels dus à cette heure, une fois par jour. */
async function sendReminders(deps: Deps, server: ServerRow): Promise<void> {
  const now = deps.now();
  if (!isReminderHour(now)) return;
  const today = todayInParis(now);

  const programs = await deps.db.get<ProgramRow>(
    "programs?select=creator_id,forced_phase,forced_phase_from",
  );
  for (const program of programs) {
    const creatorId = program.creator_id;
    const devices = await devicesOf(deps.db, creatorId);
    if (devices.length === 0) continue;

    const [logs, lastDay] = await Promise.all([
      deps.db.get<{ done: string[] }>(
        `day_logs?creator_id=eq.${creatorId}&day=eq.${today}&select=done`,
      ),
      lastActivityDay(deps.db, creatorId),
    ]);
    const due = dueReminders(now, {
      override: overrideOf(program),
      doneToday: logs[0]?.done ?? [],
      lastActivityDay: lastDay,
    });

    for (const reminder of due) {
      // Inscrire le rappel au journal le réserve : il ne partira pas deux fois ce jour-là.
      const claimed = await deps.db.insertIfNew("push_sent", {
        user_id: creatorId,
        kind: reminder.kind,
        day: reminder.day,
      });
      if (!claimed) continue;
      await notify(
        deps,
        server,
        devices,
        {
          title: reminder.title,
          body: reminder.body,
          tag: `rappel-${reminder.kind}`,
          url: HOME,
        },
        REMINDER_TTL_S,
      );
    }
  }
}

type Ring = { type: "setup" } | { type: "reminders" } | { type: "message"; id: string };

function readRing(body: unknown): Ring | null {
  const ring = body as { type?: unknown; id?: unknown } | null;
  if (ring?.type === "setup" || ring?.type === "reminders") return { type: ring.type };
  if (ring?.type === "message" && typeof ring.id === "string" && UUID.test(ring.id)) {
    return { type: "message", id: ring.id };
  }
  return null;
}

export async function handleRing(request: Request, deps: Deps): Promise<Response> {
  if (request.method !== "POST") return reply(405);

  const server = await readServer(deps.db);
  const token = request.headers.get(TOKEN_HEADER) ?? "";
  if (!server || !sameToken(token, server.ring_token)) return reply(401);

  const ring = readRing(await request.json().catch(() => null));
  if (!ring) return reply(400);

  switch (ring.type) {
    case "setup":
      await vapidKeys(deps.db, server);
      break;
    case "message":
      await announceMessage(deps, server, ring.id);
      break;
    case "reminders":
      await sendReminders(deps, server);
      break;
  }
  return reply(204);
}
