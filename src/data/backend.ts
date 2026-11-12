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
}

export const emptyTracking: Tracking = { days: {}, firsts: {}, followers: {}, hooks: [] };

export type BackendErrorCode =
  | "invalid_credentials"
  | "not_invited"
  | "already_registered"
  | "weak_password"
  | "signup_closed"
  | "network"
  | "unknown";

export class BackendError extends Error {
  readonly code: BackendErrorCode;

  constructor(code: BackendErrorCode, detail?: string) {
    super(detail ?? code);
    this.name = "BackendError";
    this.code = code;
  }
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
  addHook(creatorId: string, hook: NewHook): Promise<HookEntry>;
  deleteHook(hookId: string): Promise<void>;
}
