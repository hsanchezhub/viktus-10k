import { motion, MotionConfig } from "motion/react";
import { useState } from "react";
import { Navigate, Outlet, ScrollRestoration, useLocation } from "react-router";
import type { Account } from "../data/backend";
import { useAccount } from "../data/context";
import { useTracking, useWorkspace } from "../data/queries";
import { usePushSync } from "../features/notifications/usePush";
import { SettingsSheet } from "../features/settings/SettingsSheet";
import { ToastProvider } from "../ui/Toast";
import { Ambient } from "./Ambient";
import { SideRail, TabBar, TopBar } from "./Chrome";
import { LoadError, Splash } from "./Fallbacks";
import { JourneyProvider, useJourney } from "./journey";
import { OfflineNotice } from "./OfflineNotice";
import { LOGIN_PATH } from "./sections";

/** Porte d'entrée du site : sans compte connecté, direction l'écran de connexion. */
export function AppShell() {
  const account = useAccount();
  if (account === undefined) return <Splash />;
  if (account === null) return <Navigate to={LOGIN_PATH} replace />;
  return <SignedInShell account={account} />;
}

/** Charge le profil et le suivi, puis affiche le cadre du site. */
function SignedInShell({ account }: { account: Account }) {
  const workspace = useWorkspace(account.userId);
  const creatorId = workspace.data?.program?.creatorId ?? null;
  const tracking = useTracking(creatorId);

  if (workspace.isError || tracking.isError) {
    return (
      <LoadError
        onRetry={() => {
          void workspace.refetch();
          if (creatorId !== null) void tracking.refetch();
        }}
      />
    );
  }
  if (workspace.isPending || (creatorId !== null && tracking.isPending)) return <Splash />;

  return (
    // reducedMotion="user" : si l'appareil demande moins de mouvement, Motion ne garde que les fondus.
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <JourneyProvider workspace={workspace.data} tracking={tracking.data}>
          <Frame account={account} />
        </JourneyProvider>
      </ToastProvider>
    </MotionConfig>
  );
}

/** Le cadre commun à tous les écrans : fond, navigation, zone de contenu. */
function Frame({ account }: { account: Account }) {
  const { phase, phaseProgress, workspace } = useJourney();
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);
  // Seul le créateur reçoit des notifications.
  usePushSync(workspace.role === "creator");

  return (
    <>
      <Ambient progress={phaseProgress} />
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <TopBar role={workspace.role} phase={phase} onOpenSettings={openSettings} />
      <SideRail role={workspace.role} phase={phase} onOpenSettings={openSettings} />

      <main id="contenu" className="app-main">
        <OfflineNotice role={workspace.role} />
        <motion.div
          key={pathname}
          className="mx-auto max-w-[620px] lg:max-w-[1180px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <TabBar role={workspace.role} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        account={account}
        workspace={workspace}
      />
      <ScrollRestoration />
    </>
  );
}
