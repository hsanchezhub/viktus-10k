import type { ComponentType, SVGProps } from "react";
import type { Role } from "../data/backend";
import { CoachIcon, EditingIcon, IdeasIcon, PlanIcon, TodayIcon, TrackingIcon } from "../ui/icons";

interface Section {
  path: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const HOME_PATH = "/";
export const LOGIN_PATH = "/connexion";

const shared: readonly Section[] = [
  { path: "/plan", label: "Plan", Icon: PlanIcon },
  { path: "/idees", label: "Idées", Icon: IdeasIcon },
  { path: "/montage", label: "Montage", Icon: EditingIcon },
  { path: "/suivi", label: "Suivi", Icon: TrackingIcon },
];

/**
 * Les écrans du site, dans l'ordre des onglets. L'accueil dépend du rôle :
 * la to-do du jour pour le créateur, le tableau de bord pour le coach.
 */
export function sectionsFor(role: Role): readonly Section[] {
  const home: Section =
    role === "coach"
      ? { path: HOME_PATH, label: "Coach", Icon: CoachIcon }
      : { path: HOME_PATH, label: "Aujourd'hui", Icon: TodayIcon };
  return [home, ...shared];
}
