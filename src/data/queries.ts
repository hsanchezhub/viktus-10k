import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { IsoDate } from "../domain/dates";
import { useToast } from "../ui/Toast";
import type { HookEntry, NewHook, Tracking } from "./backend";
import { useBackend } from "./context";

const workspaceKey = (userId: string) => ["workspace", userId] as const;
const trackingKey = (creatorId: string | null) => ["tracking", creatorId] as const;
const TRACKING_WRITE = ["tracking-write"] as const;

export function useWorkspace(userId: string) {
  const backend = useBackend();
  return useQuery({
    queryKey: workspaceKey(userId),
    queryFn: () => backend.loadWorkspace(userId),
  });
}

/** Le suivi d'un créateur. Sans créateur (coach sans binôme), la requête ne part pas. */
export function useTracking(creatorId: string | null) {
  const backend = useBackend();
  return useQuery({
    queryKey: trackingKey(creatorId),
    queryFn: () => backend.loadTracking(creatorId ?? ""),
    enabled: creatorId !== null,
  });
}

/** Une écriture dans le suivi : ce qu'elle change à l'écran, et comment l'envoyer au serveur. */
interface TrackingWrite {
  apply: (tracking: Tracking) => Tracking;
  send: (creatorId: string) => Promise<unknown>;
}

export interface TrackingWrites {
  saveDay(day: IsoDate, done: string[]): Promise<unknown>;
  setFirst(key: string, doneOn: IsoDate | null): Promise<unknown>;
  saveFollowers(day: IsoDate, followers: number): Promise<unknown>;
  addHook(hook: NewHook): Promise<unknown>;
  deleteHook(hook: HookEntry): Promise<unknown>;
}

/**
 * Les écritures du suivi. Chacune s'affiche tout de suite à l'écran, puis part au serveur.
 * Les envois se font un par un, dans l'ordre : une case cochée puis décochée très vite
 * arrive au serveur dans le bon ordre. Si un envoi échoue, un message le dit et l'écran
 * est relu depuis le serveur. La promesse renvoyée échoue aussi, pour les formulaires.
 */
export function useTrackingWrites(creatorId: string | null): TrackingWrites {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const showToast = useToast();

  const { mutateAsync } = useMutation({
    mutationKey: TRACKING_WRITE,
    scope: { id: "tracking" },
    mutationFn: (write: TrackingWrite) => {
      if (creatorId === null) throw new Error("Aucun créateur à suivre");
      return write.send(creatorId);
    },
    onError: () => showToast("Pas enregistré. Vérifie ta connexion et réessaie."),
    onSettled: () => {
      // On ne relit le serveur qu'une fois la dernière écriture en attente partie.
      if (queryClient.isMutating({ mutationKey: TRACKING_WRITE }) === 1) {
        return queryClient.invalidateQueries({ queryKey: trackingKey(creatorId) });
      }
    },
  });

  return useMemo(() => {
    const key = trackingKey(creatorId);

    function run(write: TrackingWrite): Promise<unknown> {
      // L'écran change tout de suite, sans attendre le serveur ni les envois encore en file.
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Tracking>(key, (current) => current && write.apply(current));
      return mutateAsync(write);
    }

    return {
      saveDay: (day, done) =>
        run({
          apply: (tracking) => ({ ...tracking, days: { ...tracking.days, [day]: done } }),
          send: (id) => backend.saveDay(id, day, done),
        }),

      setFirst: (firstKey, doneOn) =>
        run({
          apply: (tracking) => {
            const firsts = { ...tracking.firsts };
            if (doneOn) firsts[firstKey] = doneOn;
            else delete firsts[firstKey];
            return { ...tracking, firsts };
          },
          send: (id) => backend.setFirst(id, firstKey, doneOn),
        }),

      saveFollowers: (day, followers) =>
        run({
          apply: (tracking) => ({
            ...tracking,
            followers: { ...tracking.followers, [day]: followers },
          }),
          send: (id) => backend.saveFollowers(id, day, followers),
        }),

      addHook: (hook) =>
        run({
          apply: (tracking) => ({
            ...tracking,
            // Identifiant provisoire, remplacé par celui du serveur à la relecture.
            hooks: [...tracking.hooks, { ...hook, id: `en-cours-${tracking.hooks.length}` }],
          }),
          send: (id) => backend.addHook(id, hook),
        }),

      deleteHook: (hook) =>
        run({
          apply: (tracking) => ({
            ...tracking,
            hooks: tracking.hooks.filter((candidate) => candidate.id !== hook.id),
          }),
          send: () => backend.deleteHook(hook.id),
        }),
    };
  }, [backend, creatorId, queryClient, mutateAsync]);
}
