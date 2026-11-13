import {
  onlineManager,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import type { IsoDate } from "../domain/dates";
import { useToast } from "../ui/Toast";
import type { PhaseOverride } from "../domain/phases";
import {
  type Backend,
  type HookEntry,
  isNetworkError,
  type NewHook,
  type Tracking,
} from "./backend";
import { useBackend } from "./context";
import { applyWrite, sendWrite, type TrackingWrite } from "./trackingWrites";

const workspaceKey = (userId: string) => ["workspace", userId] as const;
const trackingKey = (creatorId: string | null) => ["tracking", creatorId] as const;
const TRACKING_WRITE = ["tracking-write"] as const;
const messagesKey = (creatorId: string) => ["messages", creatorId] as const;
const invitationKey = (coachId: string) => ["invitation", coachId] as const;
const MESSAGES_REFRESH_MS = 60_000;
/**
 * Les actions du coach ne patientent pas hors ligne : elles échouent tout de suite et
 * l'écran le dit, plutôt que de laisser croire à un envoi en cours.
 */
const FAIL_FAST = { networkMode: "always" } as const;

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

export interface TrackingWrites {
  saveDay(day: IsoDate, done: string[]): Promise<unknown>;
  setFirst(key: string, doneOn: IsoDate | null): Promise<unknown>;
  saveFollowers(day: IsoDate, followers: number): Promise<unknown>;
  addHook(hook: NewHook): Promise<unknown>;
  deleteHook(hook: HookEntry): Promise<unknown>;
}

const MAX_NETWORK_RETRIES = 3;
const ignoreFailure = () => {};

/**
 * À appeler une fois au démarrage. Dit comment envoyer une écriture du suivi, y compris
 * celles qui attendaient le réseau quand le site a été fermé : elles sont relues du
 * stockage du navigateur, sans le composant qui les avait lancées.
 * Les envois se font un par un, dans l'ordre : une case cochée puis décochée très vite
 * arrive au serveur dans le bon ordre.
 */
export function registerTrackingWrites(queryClient: QueryClient, backend: Backend): void {
  queryClient.setMutationDefaults(TRACKING_WRITE, {
    mutationFn: (write: TrackingWrite) => sendWrite(backend, write),
    scope: { id: "tracking" },
    retry: (failures, error) => isNetworkError(error) && failures < MAX_NETWORK_RETRIES,
    onSettled: (_data, _error, write: TrackingWrite) => {
      // On ne relit le serveur qu'une fois la dernière écriture en attente partie.
      if (queryClient.isMutating({ mutationKey: TRACKING_WRITE }) === 1) {
        return queryClient.invalidateQueries({ queryKey: trackingKey(write.creatorId) });
      }
    },
  });
}

/**
 * Les écritures du suivi. Chacune s'affiche tout de suite à l'écran, puis part au serveur.
 * Sans réseau, elle attend son retour et l'écran la considère comme faite. Si un envoi
 * échoue, un message le dit et l'écran est relu depuis le serveur. La promesse renvoyée
 * échoue aussi, pour les formulaires.
 */
export function useTrackingWrites(creatorId: string | null): TrackingWrites {
  const queryClient = useQueryClient();
  const showToast = useToast();

  const { mutateAsync } = useMutation<unknown, Error, TrackingWrite>({
    mutationKey: TRACKING_WRITE,
    onError: () => showToast("Pas enregistré. Vérifie ta connexion et réessaie."),
  });

  return useMemo(() => {
    function run(build: (creatorId: string) => TrackingWrite): Promise<unknown> {
      if (creatorId === null) return Promise.reject(new Error("Aucun créateur à suivre"));
      const write = build(creatorId);
      const key = trackingKey(creatorId);

      // L'écran change tout de suite, sans attendre le serveur ni les envois encore en file.
      void queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Tracking>(key, (current) => current && applyWrite(current, write));

      const sent = mutateAsync(write);
      if (onlineManager.isOnline()) return sent;
      // Hors ligne, l'envoi attend le réseau : pour l'écran, c'est fait.
      sent.catch(ignoreFailure);
      return Promise.resolve();
    }

    return {
      saveDay: (day, done) => run((id) => ({ kind: "day", creatorId: id, day, done })),
      setFirst: (firstKey, doneOn) =>
        run((id) => ({ kind: "first", creatorId: id, key: firstKey, doneOn })),
      saveFollowers: (day, followers) =>
        run((id) => ({ kind: "followers", creatorId: id, day, followers })),
      // L'identifiant est créé ici : le hook garde le même, à l'écran comme sur le serveur.
      addHook: (hook) =>
        run((id) => ({
          kind: "addHook",
          creatorId: id,
          hook: { ...hook, id: crypto.randomUUID() },
        })),
      deleteHook: (hook) => run((id) => ({ kind: "deleteHook", creatorId: id, hookId: hook.id })),
    };
  }, [creatorId, queryClient, mutateAsync]);
}

/** Les messages du coach. Relus chaque minute : un nouveau message apparaît sans recharger la page. */
export function useMessages(creatorId: string) {
  const backend = useBackend();
  return useQuery({
    queryKey: messagesKey(creatorId),
    queryFn: () => backend.loadMessages(creatorId),
    refetchInterval: MESSAGES_REFRESH_MS,
  });
}

/** Relit les messages tout de suite : une notification vient d'en annoncer un nouveau. */
export function reloadMessages(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ["messages"] });
}

/** Côté créateur : signale au coach que ses messages ont été vus. */
export function useMarkMessagesRead(creatorId: string) {
  const backend = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backend.markMessagesRead(creatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: messagesKey(creatorId) }),
  });
}

/** Côté coach : écrire et supprimer un message, forcer la phase. */
export function useCoachWrites(creatorId: string, coachId: string) {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const refreshMessages = () => queryClient.invalidateQueries({ queryKey: messagesKey(creatorId) });

  const sendMessage = useMutation({
    ...FAIL_FAST,
    mutationFn: (body: string) => backend.sendMessage(creatorId, body),
    onSuccess: refreshMessages,
  });
  const deleteMessage = useMutation({
    ...FAIL_FAST,
    mutationFn: (messageId: string) => backend.deleteMessage(messageId),
    onSuccess: refreshMessages,
  });
  const setPhaseOverride = useMutation({
    ...FAIL_FAST,
    mutationFn: (override: PhaseOverride | null) => backend.setPhaseOverride(creatorId, override),
    // La phase forcée fait partie du programme, chargé avec le profil.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceKey(coachId) }),
  });

  return { sendMessage, deleteMessage, setPhaseOverride };
}

/** L'invitation en attente du coach, tant que son créateur n'a pas créé son compte. */
export function useInvitation(coachId: string) {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: invitationKey(coachId) });

  const invitation = useQuery({
    queryKey: invitationKey(coachId),
    queryFn: () => backend.loadInvitation(coachId),
  });
  const invite = useMutation({
    ...FAIL_FAST,
    mutationFn: ({ email, displayName }: { email: string; displayName: string }) =>
      backend.inviteCreator(coachId, email, displayName),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    ...FAIL_FAST,
    mutationFn: (email: string) => backend.cancelInvitation(email),
    onSuccess: refresh,
  });

  return { invitation, invite, cancel };
}
