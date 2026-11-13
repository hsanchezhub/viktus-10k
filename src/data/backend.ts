import type { IsoDate } from "../domain/dates";
import type { PhaseOverride } from "../domain/phases";

/**
 * Tout ce dont le site a besoin côté serveur : comptes et suivi du créateur.
 * Deux réalisations : Supabase (la vraie) et une version en mémoire pour les tests et la démo.
 */

export type Role = "creator" | "coach";
export type HookKind = "reel" | "essai" | "carrousel";

export interface Account {
  userId: string;
  email: string;
}

/** Le programme suivi : un créateur et son coach. */
export interface Program {
  creatorId: string;
  creatorName: string;
  coachName: string;
  phaseOverride: PhaseOverride | null;
}

export interface Workspace {
  role: Role;
  displayName: string;
  /** Celui du créateur connecté, ou du créateur que suit le coach. null tant que le coach n'a pas de créateur. */
  program: Program | null;
}

export interface HookEntry {
  id: string;
  day: IsoDate;
  kind: HookKind;
  hook: string;
  views: number | null;
  shares: number | null;
  follows: number | null;
}
export type NewHook = Omit<HookEntry, "id">;

/** Le suivi complet d'un créateur. */
export interface Tracking {
  /** Tâches cochées, par jour. */
  days: Record<IsoDate, string[]>;
  /** Premières fois faites : la clé, et le jour où elle a été cochée. */
  firsts: Record<string, IsoDate>;
  /** Abonnés relevés, par jour. */
  followers: Record<IsoDate, number>;
  hooks: HookEntry[];
  /** Dernière fois que le créateur a enregistré quelque chose. null s'il n'a encore rien saisi. */
  lastActivityAt: string | null;
}

export const emptyTracking: Tracking = {
  days: {},
  firsts: {},
  followers: {},
  hooks: [],
  lastActivityAt: null,
};

/** Un retour du coach à son créateur. */
export interface CoachMessage {
  id: string;
  body: string;
  createdAt: string;
  /** null tant que le créateur ne l'a pas vu. */
  readAt: string | null;
}

/** L'invitation en attente d'un créateur : il peut créer son compte avec cette adresse. */
export interface Invitation {
  email: string;
  displayName: string;
  expiresAt: string;
}

export type BackendErrorCode =
  | "invalid_credentials"
  | "not_invited"
  | "already_registered"
  | "weak_password"
  | "signup_closed"
  | "already_invited"
  | "network"
  | "unknown";

/** L'abonnement d'un appareil aux notifications, tel que le navigateur le fournit. */
export interface PushDevice {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class BackendError extends Error {
  readonly code: BackendErrorCode;

  constructor(code: BackendErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "BackendError";
    this.code = code;
  }
}

/** Vrai si l'échec vient du réseau : l'action peut être retentée telle quelle. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof BackendError && error.code === "network";
}

export interface Backend {
  getAccount(): Promise<Account | null>;
  /** Prévient à chaque connexion ou déconnexion. Renvoie la fonction qui arrête l'écoute. */
  onAccountChange(listener: (account: Account | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Crée le compte d'une adresse invitée. Le rôle vient de l'invitation. */
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  loadWorkspace(userId: string): Promise<Workspace>;
  loadTracking(creatorId: string): Promise<Tracking>;
  saveDay(creatorId: string, day: IsoDate, done: string[]): Promise<void>;
  /** doneOn null : la première fois est décochée. */
  setFirst(creatorId: string, key: string, doneOn: IsoDate | null): Promise<void>;
  saveFollowers(creatorId: string, day: IsoDate, followers: number): Promise<void>;
  /** L'identifiant est choisi par le site : renvoyer deux fois le même hook n'en crée qu'un. */
  addHook(creatorId: string, hook: HookEntry): Promise<void>;
  deleteHook(hookId: string): Promise<void>;

  /** Les messages du coach, du plus récent au plus ancien. */
  loadMessages(creatorId: string): Promise<CoachMessage[]>;
  sendMessage(creatorId: string, body: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  /** Le créateur a vu ses messages : tous ceux qui ne l'étaient pas passent à « lu ». */
  markMessagesRead(creatorId: string): Promise<void>;

  /** L'invitation que le coach a envoyée et qui n'a pas encore servi. */
  loadInvitation(coachId: string): Promise<Invitation | null>;
  inviteCreator(coachId: string, email: string, displayName: string): Promise<void>;
  cancelInvitation(email: string): Promise<void>;

  /** Force la phase à partir d'une date, ou revient au calendrier avec null. */
  setPhaseOverride(creatorId: string, override: PhaseOverride | null): Promise<void>;

  /** Clé publique du serveur qui envoie les notifications. null tant qu'il n'est pas prêt. */
  loadPushKey(): Promise<string | null>;
  /** Rattache cet appareil au compte connecté : il recevra ses notifications. */
  savePushDevice(device: PushDevice): Promise<void>;
  forgetPushDevice(endpoint: string): Promise<void>;
}
