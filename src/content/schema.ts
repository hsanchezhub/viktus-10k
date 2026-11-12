// Schémas de validation du contenu. Ils ne servent qu'aux tests et aux types :
// le site n'importe d'ici que des types, pour ne pas embarquer Zod dans le navigateur.
import { z } from "zod";
import { taskIds } from "../domain/tasks";
import { goalKeys } from "./goals";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");
const count = z.number().int().nonnegative();

/** Une phrase avec un début en gras : « Montrer : photo du résultat ». */
const emphasized = z.object({ fort: z.string().min(1), texte: z.string().min(1) });

const phaseSchema = z.object({
  n: z.number().int().min(1).max(4),
  name: z.string().min(1),
  from: isoDate,
  to: isoDate,
  goal: z.tuple([count, count]),
  focus: z.string().min(1),
  cadence: z.string().min(1),
  gate: z.string().min(1),
});

export const contenuSchema = z.object({
  programme: z.object({
    debut: isoDate,
    audit: z.object({
      followers: count,
      following: count,
      posts: count,
      reels: count,
      totalViews: count,
      median: count,
      median12: count,
      likeRate: z.string(),
      perFollower: count,
      lastReel: z.string(),
      salonFollowers: count,
    }),
    phases: z.array(phaseSchema).length(4),
    trajectoireObjectif: z.array(z.object({ date: isoDate, abonnes: count })).min(2),
  }),
  premieresFois: z.array(
    z.object({ id: z.string().min(1), titre: z.string().min(1), aide: z.string() }),
  ),
  buts: z.object({
    fid: z.string(),
    int: z.string(),
    emo: z.string(),
    rec: z.string(),
    ven: z.string(),
    ess: z.string(),
  }),
  concepts: z.array(
    z.object({
      but: z.enum(goalKeys),
      desLaPhase: z.number().int().min(1).max(4),
      titre: z.string().min(1),
      hook: z.string().min(1),
      plans: z.string().min(1),
      legende: z.string().min(1),
      note: z.string(),
    }),
  ),
  reelsEssai: z.array(
    z.object({
      titre: z.string().min(1),
      hook: z.string().min(1),
      deroule: z.string().min(1),
      cta: z.string().min(1),
    }),
  ),
  montage: z.object({
    instructionsProjet: z.string().min(1),
    prompts: z.array(z.object({ titre: z.string().min(1), texte: z.string().min(1) })),
  }),
  regles2026: z.array(
    z.object({ titre: z.string().min(1), detail: z.string().min(1), source: z.url() }),
  ),
});

export const complementSchema = z.object({
  // Le nom affiché du site. index.html et public/manifest.webmanifest le répètent en dur.
  site: z.object({ nom: z.string().min(1), objectif: z.string().min(1) }),
  // Le texte de chaque tâche de la to-do. La règle qui les distribue est dans domain/tasks.ts.
  taches: z.record(
    z.enum(taskIds),
    z.object({
      titre: z.string().min(1),
      aide: z.string().min(1),
      lien: z.enum(["plan", "idees", "montage", "suivi"]).optional(),
    }),
  ),
  aujourdhui: z.object({ avantLancement: z.string().min(1), premieresFois: z.string().min(1) }),
  suivi: z.object({ carnet: z.string().min(1), revueDuMois: z.array(z.string().min(1)) }),
  plan: z.object({
    audit: z.object({ titre: z.string().min(1), points: z.array(emphasized) }),
    positionnement: z.object({
      fort: z.string().min(1),
      texte: z.string().min(1),
      nomProfil: z.string().min(1),
      bio: z.string().min(1),
      noteBio: z.string(),
      noteLien: z.string(),
    }),
    aLaUne: z.array(z.object({ titre: z.string().min(1), contenu: z.string().min(1) })),
    mix: z.array(
      z.object({
        but: z.string().min(1),
        part: z.number().min(0).max(100),
        exemples: z.string(),
      }),
    ),
    semaineType: z.object({
      titre: z.string().min(1),
      jours: z.array(
        z.object({
          jour: z.string().min(1),
          publier: z.string().nullable(),
          reelPrincipal: z.boolean().optional(),
          salon: z.string().min(1),
        }),
      ),
      note: z.string(),
    }),
    mep: z.object({ intro: z.string().min(1), etapes: z.array(emphasized) }),
    filRouge: z.object({ intro: z.string().min(1), points: z.array(z.string().min(1)) }),
  }),
  idees: z.object({ introEssais: z.string().min(1) }),
  montage: z.object({
    intro: z.string().min(1),
    installation: z.object({
      etapes: z.array(z.string().min(1)),
      message: z.string().min(1),
    }),
    kit: z.object({ plans: z.array(emphasized), accord: z.string().min(1) }),
    dimanche: z.object({ etapes: z.array(z.string().min(1)) }),
    checklist: z.array(z.string().min(1)),
  }),
});

export type Contenu = z.infer<typeof contenuSchema>;
export type Complement = z.infer<typeof complementSchema>;
export type Phase = Contenu["programme"]["phases"][number];
export type Concept = Contenu["concepts"][number];
export type TrialReel = Contenu["reelsEssai"][number];
export type Emphasized = z.infer<typeof emphasized>;
