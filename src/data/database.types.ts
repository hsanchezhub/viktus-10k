// Types des tables lues et écrites par le site, alignés sur supabase/migrations.
// Version resserrée de ce que génère Supabase (generate_typescript_types) : à mettre à jour
// à chaque migration qui touche une de ces tables.

interface Table<Row, Insert> {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        { id: string; role: string; display_name: string; instagram: string | null },
        never
      >;
      programs: Table<
        {
          creator_id: string;
          coach_id: string;
          forced_phase: number | null;
          forced_phase_from: string | null;
        },
        { forced_phase: number | null; forced_phase_from: string | null }
      >;
      day_logs: Table<
        { creator_id: string; day: string; done: string[]; updated_at: string },
        { creator_id: string; day: string; done: string[] }
      >;
      firsts: Table<
        { creator_id: string; key: string; done_on: string },
        { creator_id: string; key: string; done_on: string }
      >;
      follower_stats: Table<
        { creator_id: string; day: string; followers: number; updated_at: string },
        { creator_id: string; day: string; followers: number }
      >;
      hooks: Table<
        {
          id: string;
          creator_id: string;
          day: string;
          kind: string;
          hook: string;
          views: number | null;
          shares: number | null;
          follows: number | null;
          created_at: string;
        },
        {
          creator_id: string;
          day: string;
          kind: string;
          hook: string;
          views: number | null;
          shares: number | null;
          follows: number | null;
        }
      >;
      coach_messages: Table<
        {
          id: string;
          creator_id: string;
          coach_id: string;
          body: string;
          created_at: string;
          read_at: string | null;
        },
        { creator_id: string; body: string; read_at?: string | null }
      >;
      invitations: Table<
        {
          email: string;
          role: string;
          display_name: string;
          invited_by: string | null;
          expires_at: string;
        },
        { email: string; role: string; display_name: string; invited_by: string }
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
