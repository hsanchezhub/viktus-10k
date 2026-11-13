import type { IsoDate } from "../domain/dates";
import type { Backend, HookEntry, Tracking } from "./backend";

/**
 * Une écriture dans le suivi, décrite par des données simples (pas de fonction) : elle peut
 * ainsi attendre le retour du réseau, même si le site est fermé entre-temps.
 */
export type TrackingWrite =
  | { kind: "day"; creatorId: string; day: IsoDate; done: string[] }
  | { kind: "first"; creatorId: string; key: string; doneOn: IsoDate | null }
  | { kind: "followers"; creatorId: string; day: IsoDate; followers: number }
  | { kind: "addHook"; creatorId: string; hook: HookEntry }
  | { kind: "deleteHook"; creatorId: string; hookId: string };

/** Ce que l'écriture change à l'écran, sans attendre le serveur. */
export function applyWrite(tracking: Tracking, write: TrackingWrite): Tracking {
  switch (write.kind) {
    case "day":
      return { ...tracking, days: { ...tracking.days, [write.day]: write.done } };

    case "first": {
      const firsts = { ...tracking.firsts };
      if (write.doneOn) firsts[write.key] = write.doneOn;
      else delete firsts[write.key];
      return { ...tracking, firsts };
    }

    case "followers":
      return { ...tracking, followers: { ...tracking.followers, [write.day]: write.followers } };

    case "addHook":
      // Rejouée après une coupure, la même écriture ne doit pas créer un doublon.
      if (tracking.hooks.some((hook) => hook.id === write.hook.id)) return tracking;
      return { ...tracking, hooks: [...tracking.hooks, write.hook] };

    case "deleteHook":
      return { ...tracking, hooks: tracking.hooks.filter((hook) => hook.id !== write.hookId) };
  }
}

/** L'envoi de l'écriture au serveur. */
export function sendWrite(backend: Backend, write: TrackingWrite): Promise<void> {
  switch (write.kind) {
    case "day":
      return backend.saveDay(write.creatorId, write.day, write.done);
    case "first":
      return backend.setFirst(write.creatorId, write.key, write.doneOn);
    case "followers":
      return backend.saveFollowers(write.creatorId, write.day, write.followers);
    case "addHook":
      return backend.addHook(write.creatorId, write.hook);
    case "deleteHook":
      return backend.deleteHook(write.hookId);
  }
}
