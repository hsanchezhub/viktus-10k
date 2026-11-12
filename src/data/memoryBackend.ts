import type { PhaseOverride } from "../domain/phases";
import {
  type Account,
  type Backend,
  BackendError,
  type CoachMessage,
  emptyTracking,
  type HookEntry,
  type Role,
  type Tracking,
} from "./backend";

/**
 * Backend en mémoire, pour les tests de parcours et la démo locale (VITE_BACKEND=memory).
 * Il suit les mêmes règles que Supabase : compte sur invitation, rôle fixé par l'invitation,
 * suivi rattaché au créateur. Rien ne quitte le navigateur : l'état vit dans localStorage.
 */

export const DEMO_STORAGE_KEY = "viktus:demo";
const INVITATION_MS = 7 * 86_400_000;

interface DemoUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  displayName: string;
}

export interface DemoState {
  /** Adresses autorisées à créer un compte, avec le rôle qu'elles recevront. */
  invitations: Array<{ email: string; role: Role; displayName: string; expiresAt?: string }>;
  users: DemoUser[];
  sessionUserId: string | null;
  /** Suivi du créateur. La démo ne connaît qu'un binôme. */
  tracking: Tracking;
  messages: CoachMessage[];
  phaseOverride: PhaseOverride | null;
}

const initialState: DemoState = {
  invitations: [
    { email: "victor@demo.test", role: "creator", displayName: "Victor" },
    { email: "hugo@demo.test", role: "coach", displayName: "Hugo" },
  ],
  users: [],
  sessionUserId: null,
  tracking: emptyTracking,
  messages: [],
  phaseOverride: null,
};

function read(): DemoState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) return { ...initialState, ...(JSON.parse(raw) as Partial<DemoState>) };
  } catch {
    // État illisible : on repart de l'état initial.
  }
  return structuredClone(initialState);
}

function write(state: DemoState): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

function toAccount(state: DemoState): Account | null {
  const user = state.users.find((candidate) => candidate.id === state.sessionUserId);
  return user ? { userId: user.id, email: user.email } : null;
}

export function createMemoryBackend(): Backend {
  const listeners = new Set<(account: Account | null) => void>();

  /** Lit l'état, applique un changement, l'enregistre. */
  function update(change: (state: DemoState) => void): DemoState {
    const state = read();
    change(state);
    write(state);
    return state;
  }

  function notify(state: DemoState): void {
    const account = toAccount(state);
    listeners.forEach((listener) => listener(account));
  }

  return {
    async getAccount() {
      return toAccount(read());
    },

    onAccountChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async signIn(email, password) {
      const state = read();
      const user = state.users.find(
        (candidate) => candidate.email === email.toLowerCase() && candidate.password === password,
      );
      if (!user) throw new BackendError("invalid_credentials");
      state.sessionUserId = user.id;
      write(state);
      notify(state);
    },

    async signUp(email, password) {
      const address = email.toLowerCase();
      const state = read();
      if (state.users.some((user) => user.email === address)) {
        throw new BackendError("already_registered");
      }
      const invitation = state.invitations.find((candidate) => candidate.email === address);
      if (!invitation) throw new BackendError("not_invited");
      if (password.length < 8) throw new BackendError("weak_password");

      const user: DemoUser = {
        id: `demo-${invitation.role}`,
        email: address,
        password,
        role: invitation.role,
        displayName: invitation.displayName,
      };
      state.users.push(user);
      state.invitations = state.invitations.filter((candidate) => candidate.email !== address);
      state.sessionUserId = user.id;
      write(state);
      notify(state);
    },

    async signOut() {
      notify(update((state) => (state.sessionUserId = null)));
    },

    async loadWorkspace(userId) {
      const state = read();
      const user = state.users.find((candidate) => candidate.id === userId);
      if (!user) throw new BackendError("unknown", "Compte introuvable");
      const creator = state.users.find((candidate) => candidate.role === "creator");
      const coach = state.users.find((candidate) => candidate.role === "coach");
      return {
        role: user.role,
        displayName: user.displayName,
        program: creator
          ? {
              creatorId: creator.id,
              creatorName: creator.displayName,
              coachName: coach?.displayName ?? "Hugo",
              phaseOverride: state.phaseOverride,
            }
          : null,
      };
    },

    async loadTracking() {
      return { ...emptyTracking, ...read().tracking };
    },

    async saveDay(_creatorId, day, done) {
      update((state) => {
        state.tracking.days[day] = done;
        state.tracking.lastActivityAt = new Date().toISOString();
      });
    },

    async setFirst(_creatorId, key, doneOn) {
      update((state) => {
        if (doneOn) state.tracking.firsts[key] = doneOn;
        else delete state.tracking.firsts[key];
        state.tracking.lastActivityAt = new Date().toISOString();
      });
    },

    async saveFollowers(_creatorId, day, followers) {
      update((state) => {
        state.tracking.followers[day] = followers;
        state.tracking.lastActivityAt = new Date().toISOString();
      });
    },

    async addHook(_creatorId, hook) {
      const entry: HookEntry = { ...hook, id: crypto.randomUUID() };
      update((state) => {
        state.tracking.hooks.push(entry);
        state.tracking.lastActivityAt = new Date().toISOString();
      });
      return entry;
    },

    async deleteHook(hookId) {
      update((state) => {
        state.tracking.hooks = state.tracking.hooks.filter((hook) => hook.id !== hookId);
      });
    },

    async loadMessages() {
      return read().messages.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async sendMessage(_creatorId, body) {
      update((state) =>
        state.messages.push({
          id: crypto.randomUUID(),
          body,
          createdAt: new Date().toISOString(),
          readAt: null,
        }),
      );
    },

    async deleteMessage(messageId) {
      update((state) => {
        state.messages = state.messages.filter((message) => message.id !== messageId);
      });
    },

    async markMessagesRead() {
      const now = new Date().toISOString();
      update((state) => {
        state.messages = state.messages.map((message) => ({
          ...message,
          readAt: message.readAt ?? now,
        }));
      });
    },

    async loadInvitation() {
      const invitation = read().invitations.find((candidate) => candidate.role === "creator");
      if (!invitation) return null;
      return {
        email: invitation.email,
        displayName: invitation.displayName,
        expiresAt: invitation.expiresAt ?? new Date(Date.now() + INVITATION_MS).toISOString(),
      };
    },

    async inviteCreator(_coachId, email, displayName) {
      const address = email.toLowerCase();
      const state = read();
      if (state.invitations.some((candidate) => candidate.email === address)) {
        throw new BackendError("already_invited");
      }
      state.invitations.push({
        email: address,
        role: "creator",
        displayName,
        expiresAt: new Date(Date.now() + INVITATION_MS).toISOString(),
      });
      write(state);
    },

    async cancelInvitation(email) {
      update((state) => {
        state.invitations = state.invitations.filter((candidate) => candidate.email !== email);
      });
    },

    async setPhaseOverride(_creatorId, override) {
      update((state) => (state.phaseOverride = override));
    },
  };
}
