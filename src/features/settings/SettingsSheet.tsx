import { complement } from "../../content";
import type { Account, Workspace } from "../../data/backend";
import { useBackend } from "../../data/context";
import { setTheme, useTheme } from "../../lib/theme";
import { InstallIcon, LogoutIcon, MoonIcon, SunIcon } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { useInstall } from "../install/useInstall";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  account: Account;
  workspace: Workspace;
}

const roleLabel = { creator: "Créateur", coach: "Coach" } as const;

const installGuides = [
  {
    device: "iPhone (Safari)",
    steps: [
      "Ouvre ce site dans Safari.",
      "Touche le bouton Partager (le carré avec la flèche).",
      `Choisis « Sur l'écran d'accueil », vérifie le nom ${complement.site.nom}, puis Ajouter.`,
    ],
  },
  {
    device: "Android (Chrome)",
    steps: [
      "Ouvre ce site dans Chrome.",
      "Touche le menu ⋮ en haut à droite.",
      "Choisis « Ajouter à l'écran d'accueil ».",
    ],
  },
] as const;

/** Compte, thème et installation sur l'écran d'accueil, réunis au même endroit. */
export function SettingsSheet({ open, onClose, account, workspace }: SettingsSheetProps) {
  const backend = useBackend();
  const theme = useTheme();
  const install = useInstall();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <Sheet open={open} onClose={onClose} title="Réglages">
      <div className="flex flex-col gap-3">
        <section className="well p-4">
          <p className="eyebrow">{roleLabel[workspace.role]}</p>
          <p className="mt-1 font-extrabold">{workspace.displayName}</p>
          <p className="truncate text-[13.5px] text-muted">{account.email}</p>
          <button type="button" className="btn mt-3" onClick={() => void backend.signOut()}>
            <LogoutIcon width={16} height={16} />
            Se déconnecter
          </button>
        </section>

        <section className="well p-4">
          <p className="eyebrow mb-3">Affichage</p>
          <button type="button" className="btn" onClick={() => setTheme(nextTheme)}>
            {nextTheme === "light" ? (
              <SunIcon width={16} height={16} />
            ) : (
              <MoonIcon width={16} height={16} />
            )}
            {nextTheme === "light" ? "Passer au thème clair" : "Passer au thème sombre"}
          </button>
        </section>

        {!install.installed && (
          <section className="well p-4">
            <p className="eyebrow">Sur ton écran d'accueil</p>
            <p className="mt-1 mb-3 text-[14px] text-muted">
              Tu l'ouvres en un geste, comme une vraie appli, et tu pourras recevoir les messages de
              ton coach.
            </p>
            {install.promptNative ? (
              <button type="button" className="btn" onClick={() => void install.promptNative?.()}>
                <InstallIcon width={16} height={16} />
                Installer
              </button>
            ) : (
              <div className="flex flex-col gap-4">
                {installGuides.map((guide) => (
                  <div key={guide.device}>
                    <h3 className="mb-2 text-[14.5px] font-extrabold">{guide.device}</h3>
                    <ol className="steps text-[14px]">
                      {guide.steps.map((step) => (
                        <li key={step}>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
