import { describe, expect, it, vi } from "vitest";
import { type Backend, emptyTracking, type HookEntry, type Tracking } from "./backend";
import { applyWrite, sendWrite, type TrackingWrite } from "./trackingWrites";

const creatorId = "victor";
const hook: HookEntry = {
  id: "hook-1",
  day: "2026-11-17",
  kind: "reel",
  hook: "Tu rates ton dégradé à cause de ça",
  views: null,
  shares: null,
  follows: null,
};

describe("applyWrite", () => {
  it("remplace les tâches cochées du jour sans toucher aux autres jours", () => {
    const before: Tracking = { ...emptyTracking, days: { "2026-11-16": ["followers"] } };
    const after = applyWrite(before, {
      kind: "day",
      creatorId,
      day: "2026-11-17",
      done: ["kit", "post_tue"],
    });
    expect(after.days).toEqual({ "2026-11-16": ["followers"], "2026-11-17": ["kit", "post_tue"] });
    expect(before.days).toEqual({ "2026-11-16": ["followers"] });
  });

  it("coche puis décoche une première fois", () => {
    const checked = applyWrite(emptyTracking, {
      kind: "first",
      creatorId,
      key: "premier-reel",
      doneOn: "2026-11-17",
    });
    expect(checked.firsts).toEqual({ "premier-reel": "2026-11-17" });

    const unchecked = applyWrite(checked, {
      kind: "first",
      creatorId,
      key: "premier-reel",
      doneOn: null,
    });
    expect(unchecked.firsts).toEqual({});
  });

  it("enregistre un relevé d'abonnés", () => {
    const after = applyWrite(emptyTracking, {
      kind: "followers",
      creatorId,
      day: "2026-11-16",
      followers: 652,
    });
    expect(after.followers).toEqual({ "2026-11-16": 652 });
  });

  it("ajoute un hook une seule fois, même si l'écriture est rejouée", () => {
    const write: TrackingWrite = { kind: "addHook", creatorId, hook };
    const once = applyWrite(emptyTracking, write);
    const twice = applyWrite(once, write);
    expect(twice.hooks).toEqual([hook]);
  });

  it("supprime un hook", () => {
    const before: Tracking = { ...emptyTracking, hooks: [hook] };
    expect(applyWrite(before, { kind: "deleteHook", creatorId, hookId: hook.id }).hooks).toEqual(
      [],
    );
  });
});

describe("sendWrite", () => {
  it("envoie chaque écriture à la bonne fonction du serveur", async () => {
    const backend = {
      saveDay: vi.fn().mockResolvedValue(undefined),
      setFirst: vi.fn().mockResolvedValue(undefined),
      saveFollowers: vi.fn().mockResolvedValue(undefined),
      addHook: vi.fn().mockResolvedValue(undefined),
      deleteHook: vi.fn().mockResolvedValue(undefined),
    };
    const send = (write: TrackingWrite) => sendWrite(backend as unknown as Backend, write);

    await send({ kind: "day", creatorId, day: "2026-11-17", done: ["kit"] });
    await send({ kind: "first", creatorId, key: "premier-reel", doneOn: null });
    await send({ kind: "followers", creatorId, day: "2026-11-16", followers: 652 });
    await send({ kind: "addHook", creatorId, hook });
    await send({ kind: "deleteHook", creatorId, hookId: hook.id });

    expect(backend.saveDay).toHaveBeenCalledWith(creatorId, "2026-11-17", ["kit"]);
    expect(backend.setFirst).toHaveBeenCalledWith(creatorId, "premier-reel", null);
    expect(backend.saveFollowers).toHaveBeenCalledWith(creatorId, "2026-11-16", 652);
    expect(backend.addHook).toHaveBeenCalledWith(creatorId, hook);
    expect(backend.deleteHook).toHaveBeenCalledWith(hook.id);
  });
});
