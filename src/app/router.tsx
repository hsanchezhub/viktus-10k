import { createBrowserRouter } from "react-router";
import { LoginScreen } from "../features/auth/LoginScreen";
import { IdeasScreen } from "../features/ideas/IdeasScreen";
import { MontageScreen } from "../features/montage/MontageScreen";
import { PlanScreen } from "../features/plan/PlanScreen";
import { TodayScreen } from "../features/today/TodayScreen";
import { TrackingScreen } from "../features/tracking/TrackingScreen";
import { AppShell } from "./AppShell";
import { CrashScreen, NotFoundScreen } from "./Fallbacks";
import { LOGIN_PATH } from "./sections";

// Sur GitHub Pages le site vit sous /viktus-10k/ : Vite fournit ce préfixe dans BASE_URL.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createBrowserRouter(
  [
    { path: LOGIN_PATH, element: <LoginScreen />, errorElement: <CrashScreen /> },
    {
      path: "/",
      element: <AppShell />,
      errorElement: <CrashScreen />,
      children: [
        { index: true, element: <TodayScreen /> },
        { path: "plan", element: <PlanScreen /> },
        { path: "idees", element: <IdeasScreen /> },
        { path: "montage", element: <MontageScreen /> },
        { path: "suivi", element: <TrackingScreen /> },
        { path: "*", element: <NotFoundScreen /> },
      ],
    },
  ],
  { basename },
);
