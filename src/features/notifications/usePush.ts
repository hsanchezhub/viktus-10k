import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Backend } from "../../data/backend";
import { useBackend } from "../../data/context";
import {
  askPermission,
  currentDevice,
  type PushStatus,
  readPushStatus,
  subscribeDevice,
  unsubscribeDevice,
} from "./push";

/** État propre à cet appareil : il n'est pas gardé dans la copie hors ligne (voir main.tsx). */
export const DEVICE_QUERY = "device";
const PUSH_STATUS = [DEVICE_QUERY, "push"] as const;
/** L'appareil décide seul, sans réseau, de ce qu'il sait faire. */
const ON_DEVICE = { networkMode: "always", retry: false } as const;

/** Pourquoi l'activation n'a pas abouti, en mots que l'écran peut afficher. */
export type PushFailure = "refused" | "not-ready" | "failed";

class PushError extends Error {
  readonly reason: PushFailure;

  constructor(reason: PushFailure) {
    super(reason);
    this.name = "PushError";
    this.reason = reason;
  }
}

/** Retire cet appareil des notifications du compte. À faire avant de se déconnecter. */
export async function forgetThisDevice(backend: Backend): Promise<void> {
  const endpoint = await unsubscribeDevice();
  // Si le serveur n'est pas joignable, il retirera lui-même l'abonnement au prochain envoi.
  if (endpoint) await backend.forgetPushDevice(endpoint).catch(() => {});
}

export interface Push {
  /** undefined le temps de lire l'état de l'appareil. */
  status: PushStatus | undefined;
  busy: boolean;
  failure: PushFailure | null;
  enable(): void;
  disable(): void;
}

/** L'état des notifications sur cet appareil. undefined le temps de le lire. */
function usePushStatus() {
  return useQuery({
    ...ON_DEVICE,
    queryKey: PUSH_STATUS,
    queryFn: readPushStatus,
    staleTime: Infinity,
  }).data;
}

/** Les notifications sur cet appareil : leur état, et de quoi les activer ou les couper. */
export function usePush(): Push {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const status = usePushStatus();
  const refresh = () => queryClient.invalidateQueries({ queryKey: PUSH_STATUS });

  const enable = useMutation({
    ...ON_DEVICE,
    mutationFn: async () => {
      // L'autorisation d'abord, sans rien attendre avant : c'est une exigence de Safari.
      if (!(await askPermission())) throw new PushError("refused");
      const serverKey = await backend.loadPushKey();
      if (!serverKey) throw new PushError("not-ready");
      await backend.savePushDevice(await subscribeDevice(serverKey));
    },
    onSettled: refresh,
  });

  const disable = useMutation({
    ...ON_DEVICE,
    mutationFn: () => forgetThisDevice(backend),
    onSettled: refresh,
  });

  const failed = enable.error ?? disable.error;
  return {
    status,
    busy: enable.isPending || disable.isPending,
    failure: failed ? (failed instanceof PushError ? failed.reason : "failed") : null,
    enable: () => {
      disable.reset();
      enable.mutate();
    },
    disable: () => {
      enable.reset();
      disable.mutate();
    },
  };
}

/**
 * À chaque ouverture, redonne au serveur l'abonnement de cet appareil : s'il l'avait
 * perdu, les notifications reprennent sans que l'utilisateur ait rien à refaire.
 */
export function usePushSync(enabled: boolean): void {
  const backend = useBackend();
  const subscribed = usePushStatus() === "on" && enabled;

  useEffect(() => {
    if (!subscribed) return;
    void currentDevice()
      .then((device) => device && backend.savePushDevice(device))
      // Pas de réseau ou serveur injoignable : on réessaiera à la prochaine ouverture.
      .catch(() => {});
  }, [backend, subscribed]);
}
