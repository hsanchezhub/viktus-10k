import { CoachScreen } from "../features/coach/CoachScreen";
import { TodayScreen } from "../features/today/TodayScreen";
import { useJourney } from "./journey";

/** L'accueil dépend du rôle : la to-do du jour pour le créateur, le tableau de bord pour le coach. */
export function HomeScreen() {
  const { workspace } = useJourney();
  return workspace.role === "coach" ? <CoachScreen /> : <TodayScreen />;
}
