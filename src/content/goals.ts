/** Les 5 buts SPARTA d'un contenu, dans l'ordre des filtres. */
export const goalKeys = ["fid", "int", "emo", "rec", "ven"] as const;
export type GoalKey = (typeof goalKeys)[number];
