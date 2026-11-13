import { type AuthError, createClient, type Session } from "@supabase/supabase-js";
import {
  type Account,
  type Backend,
  BackendError,
  emptyTracking,
  type HookEntry,
  type HookKind,
  type Role,
  type Tracking,
} from "./backend";
import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

function toAccount(session: Session | null): Account | null {
  if (!session) return null;
  return { userId: session.user.id, email: session.user.email ?? "" };
}

function isNetworkFailure(error: { name?: string; message: string }): boolean {
  return error.name === "AuthRetryableFetchError" || /fetch|network/i.test(error.message);
}

/** Traduit une erreur d'authentification Supabase en un cas que l'écran sait expliquer. */
function authFailure(error: AuthError, action: "signIn" | "signUp"): BackendError {
  if (isNetworkFailure(error)) return new BackendError("network", error.message);
  switch (error.code) {
    case "invalid_credentials":
      return new BackendError("invalid_credentials", error.message);
    case "user_already_exists":
    case "email_exists":
      return new BackendError("already_registered", error.message);
    case "weak_password":
      return new BackendError("weak_password", error.message);
    case "email_not_confirmed":
    case "signup_disabled":
    case "email_address_not_authorized":
    case "over_email_send_rate_limit":
      return new BackendError("signup_closed", error.message);
  }
  // Une adresse non invitée est refusée par un déclencheur de la base (not_invited) :
  // Supabase le rapporte comme une erreur de base à la création du compte.
  if (action === "signUp" && /database error|not_invited/i.test(error.message)) {
    return new BackendError("not_invited", error.message);
  }
  return new BackendError("unknown", error.message);
}

function dataFailure(error: { message: string }): BackendError {
  return new BackendError(isNetworkFailure(error) ? "network" : "unknown", error.message);
}

function toHook(row: Omit<Tables["hooks"]["Row"], "created_at">): HookEntry {
  return {
    id: row.id,
    day: row.day,
    kind: row.kind as HookKind,
    hook: row.hook,
    views: row.views,
    shares: row.shares,
    follows: row.follows,
  };
}

export function createSupabaseBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Configuration Supabase manquante : voir .env.example");
  }
  const client = createClient<Database>(url, key);

  return {
    async getAccount() {
      const { data, error } = await client.auth.getSession();
      if (error) throw authFailure(error, "signIn");
      return toAccount(data.session);
    },

    onAccountChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        // L'état de départ est lu par getAccount. Sans réseau, Supabase l'annonce vide alors
        // que la session existe toujours : on ne l'écoute pas.
        if (event === "INITIAL_SESSION") return;
        listener(toAccount(session));
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw authFailure(error, "signIn");
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw authFailure(error, "signUp");
      // Pas de session : Supabase attend une confirmation par e-mail, que ce projet n'envoie pas.
      // Le réglage « Confirm email » doit être désactivé dans Supabase.
      if (!data.session) throw new BackendError("signup_closed");
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw authFailure(error, "signIn");
    },

    async loadWorkspace(userId) {
      const profile = await client
        .from("profiles")
        .select("id, role, display_name")
        .eq("id", userId)
        .single();
      if (profile.error) throw dataFailure(profile.error);
      const role = profile.data.role as Role;

      const program = await client
        .from("programs")
        .select("creator_id, coach_id, forced_phase, forced_phase_from")
        .eq(role === "creator" ? "creator_id" : "coach_id", userId)
        .limit(1)
        .maybeSingle();
      if (program.error) throw dataFailure(program.error);
      if (!program.data) {
        return { role, displayName: profile.data.display_name, program: null };
      }

      const { creator_id, coach_id, forced_phase, forced_phase_from } = program.data;
      const partners = await client
        .from("profiles")
        .select("id, display_name")
        .in("id", [creator_id, coach_id]);
      if (partners.error) throw dataFailure(partners.error);
      const nameOf = (id: string) =>
        partners.data.find((partner) => partner.id === id)?.display_name ?? "";

      return {
        role,
        displayName: profile.data.display_name,
        program: {
          creatorId: creator_id,
          creatorName: nameOf(creator_id),
          coachName: nameOf(coach_id),
          phaseOverride:
            forced_phase !== null && forced_phase_from !== null
              ? { phase: forced_phase, from: forced_phase_from }
              : null,
        },
      };
    },

    async loadTracking(creatorId) {
      const [days, firsts, followers, hooks] = await Promise.all([
        client.from("day_logs").select("day, done, updated_at").eq("creator_id", creatorId),
        client.from("firsts").select("key, done_on").eq("creator_id", creatorId),
        client
          .from("follower_stats")
          .select("day, followers, updated_at")
          .eq("creator_id", creatorId),
        client
          .from("hooks")
          .select("id, creator_id, day, kind, hook, views, shares, follows, created_at")
          .eq("creator_id", creatorId),
      ]);
      const failure = days.error ?? firsts.error ?? followers.error ?? hooks.error;
      if (failure) throw dataFailure(failure);

      const tracking: Tracking = { ...emptyTracking, days: {}, firsts: {}, followers: {} };
      for (const row of days.data ?? []) tracking.days[row.day] = row.done;
      for (const row of firsts.data ?? []) tracking.firsts[row.key] = row.done_on;
      for (const row of followers.data ?? []) tracking.followers[row.day] = row.followers;
      tracking.hooks = (hooks.data ?? []).map(toHook);

      // Dernière activité : la saisie la plus récente, toutes tables confondues.
      const stamps = [
        ...(days.data ?? []).map((row) => row.updated_at),
        ...(followers.data ?? []).map((row) => row.updated_at),
        ...(hooks.data ?? []).map((row) => row.created_at),
      ];
      tracking.lastActivityAt = stamps.sort().at(-1) ?? null;
      return tracking;
    },

    async saveDay(creatorId, day, done) {
      const { error } = await client
        .from("day_logs")
        .upsert({ creator_id: creatorId, day, done }, { onConflict: "creator_id,day" });
      if (error) throw dataFailure(error);
    },

    async setFirst(creatorId, key, doneOn) {
      const { error } = doneOn
        ? await client
            .from("firsts")
            .upsert(
              { creator_id: creatorId, key, done_on: doneOn },
              { onConflict: "creator_id,key" },
            )
        : await client.from("firsts").delete().eq("creator_id", creatorId).eq("key", key);
      if (error) throw dataFailure(error);
    },

    async saveFollowers(creatorId, day, followers) {
      const { error } = await client
        .from("follower_stats")
        .upsert({ creator_id: creatorId, day, followers }, { onConflict: "creator_id,day" });
      if (error) throw dataFailure(error);
    },

    async addHook(creatorId, hook) {
      // Un hook déjà enregistré (envoi rejoué après une coupure) est laissé tel quel.
      const { error } = await client
        .from("hooks")
        .upsert({ creator_id: creatorId, ...hook }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw dataFailure(error);
    },

    async deleteHook(hookId) {
      const { error } = await client.from("hooks").delete().eq("id", hookId);
      if (error) throw dataFailure(error);
    },

    async loadMessages(creatorId) {
      const { data, error } = await client
        .from("coach_messages")
        .select("id, body, created_at, read_at")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      if (error) throw dataFailure(error);
      return data.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
        readAt: row.read_at,
      }));
    },

    async sendMessage(creatorId, body) {
      // L'auteur (coach_id) est rempli par la base avec le compte connecté.
      const { error } = await client.from("coach_messages").insert({ creator_id: creatorId, body });
      if (error) throw dataFailure(error);
    },

    async deleteMessage(messageId) {
      const { error } = await client.from("coach_messages").delete().eq("id", messageId);
      if (error) throw dataFailure(error);
    },

    async markMessagesRead(creatorId) {
      const { error } = await client
        .from("coach_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("creator_id", creatorId)
        .is("read_at", null);
      if (error) throw dataFailure(error);
    },

    async loadInvitation(coachId) {
      const { data, error } = await client
        .from("invitations")
        .select("email, display_name, expires_at")
        .eq("invited_by", coachId)
        .limit(1)
        .maybeSingle();
      if (error) throw dataFailure(error);
      if (!data) return null;
      return { email: data.email, displayName: data.display_name, expiresAt: data.expires_at };
    },

    async inviteCreator(coachId, email, displayName) {
      const { error } = await client.from("invitations").insert({
        email: email.toLowerCase(),
        role: "creator",
        display_name: displayName,
        invited_by: coachId,
      });
      // 23505 : cette adresse a déjà une invitation en attente.
      if (error?.code === "23505") throw new BackendError("already_invited", error.message);
      if (error) throw dataFailure(error);
    },

    async cancelInvitation(email) {
      const { error } = await client.from("invitations").delete().eq("email", email);
      if (error) throw dataFailure(error);
    },

    async setPhaseOverride(creatorId, override) {
      const { error } = await client
        .from("programs")
        .update({
          forced_phase: override?.phase ?? null,
          forced_phase_from: override?.from ?? null,
        })
        .eq("creator_id", creatorId);
      if (error) throw dataFailure(error);
    },

    async loadPushKey() {
      const { data, error } = await client.from("push_server").select("public_key").maybeSingle();
      if (error) throw dataFailure(error);
      return data?.public_key ?? null;
    },

    async savePushDevice(device) {
      // La base rattache l'appareil au compte connecté et remplace son ancien abonnement.
      const { error } = await client.from("push_devices").insert(device);
      if (error) throw dataFailure(error);
    },

    async forgetPushDevice(endpoint) {
      const { error } = await client.from("push_devices").delete().eq("endpoint", endpoint);
      if (error) throw dataFailure(error);
    },
  };
}
