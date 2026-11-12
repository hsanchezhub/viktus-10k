import type { ComponentType, SVGProps } from "react";
import { EditingIcon, IdeasIcon, PlanIcon, TodayIcon, TrackingIcon } from "../ui/icons";

interface Section {
  path: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const HOME_PATH = "/";
export const LOGIN_PATH = "/connexion";

/** Les écrans du site, dans l'ordre des onglets. */
export const sections: readonly Section[] = [
  { path: HOME_PATH, label: "Aujourd'hui", Icon: TodayIcon },
  { path: "/plan", label: "Plan", Icon: PlanIcon },
  { path: "/idees", label: "Idées", Icon: IdeasIcon },
  { path: "/montage", label: "Montage", Icon: EditingIcon },
  { path: "/suivi", label: "Suivi", Icon: TrackingIcon },
];
