import { createRest } from "./rest";
import { handleRing } from "./service";

// Point d'entrée de la fonction Supabase « push ». Elle tourne sous Deno : ce fichier est
// le seul à en dépendre. Elle est assemblée en un fichier par scripts/build-function.mjs.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

/** Adresse du site : le contact que les services de notifications demandent au serveur d'envoi. */
const SITE_URL = "https://hsanchezhub.github.io/viktus-10k/";

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable ${name} absente de l'environnement`);
  return value;
}

/** La clé secrète du projet, fournie par Supabase à ses fonctions. Jamais écrite ailleurs. */
function secretKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    const { default: key } = JSON.parse(keys) as { default?: unknown };
    if (typeof key === "string") return key;
  }
  // Projets restés sur les anciennes clés.
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

const db = createRest(required("SUPABASE_URL"), secretKey(), fetch);

Deno.serve(async (request) => {
  try {
    return await handleRing(request, { db, fetch, now: () => new Date(), subject: SITE_URL });
  } catch (error) {
    // Le détail va dans les journaux de la fonction, jamais dans la réponse.
    console.error(error);
    return new Response(null, { status: 500 });
  }
});
