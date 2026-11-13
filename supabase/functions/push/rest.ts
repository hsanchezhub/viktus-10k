/**
 * Accès à la base par l'API de données de Supabase, avec la clé secrète du projet :
 * la fonction lit et écrit sans passer par les règles d'accès des utilisateurs.
 */

export interface Rest {
  get<Row>(path: string): Promise<Row[]>;
  /** Modifie les lignes visées et renvoie celles qui l'ont été. */
  patch<Row>(path: string, changes: object): Promise<Row[]>;
  /** Ajoute une ligne si elle n'existe pas déjà. Renvoie vrai si elle vient d'être créée. */
  insertIfNew(table: string, row: object): Promise<boolean>;
  remove(path: string): Promise<void>;
}

export function createRest(projectUrl: string, secretKey: string, fetchFn: typeof fetch): Rest {
  const baseHeaders: Record<string, string> = {
    apikey: secretKey,
    "Content-Type": "application/json",
    // Les anciennes clés (des jetons JWT) se présentent aussi en Authorization.
    ...(secretKey.startsWith("eyJ") ? { Authorization: `Bearer ${secretKey}` } : {}),
  };

  async function call<Row>(
    method: string,
    path: string,
    body?: object,
    prefer?: string,
  ): Promise<Row[]> {
    const response = await fetchFn(`${projectUrl}/rest/v1/${path}`, {
      method,
      headers: prefer ? { ...baseHeaders, Prefer: prefer } : baseHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(
        `${method} ${path.split("?")[0]} : ${response.status} ${await response.text()}`,
      );
    }
    return response.status === 204 ? [] : ((await response.json()) as Row[]);
  }

  return {
    get: (path) => call("GET", path),
    patch: (path, changes) => call("PATCH", path, changes, "return=representation"),
    insertIfNew: async (table, row) => {
      const created = await call(
        "POST",
        table,
        row,
        "resolution=ignore-duplicates,return=representation",
      );
      return created.length > 0;
    },
    remove: async (path) => {
      await call("DELETE", path);
    },
  };
}
