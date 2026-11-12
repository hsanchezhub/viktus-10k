import { Link } from "react-router";
import { complement } from "../content";
import { Panel } from "../ui/Panel";
import { Ambient } from "./Ambient";
import { HOME_PATH } from "./sections";

/** Écran d'attente : session ou données en cours de chargement. */
export function Splash() {
  return (
    <>
      <Ambient progress={0} />
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6"
        role="status"
        aria-live="polite"
      >
        <p className="display text-[34px]">{complement.site.nom}</p>
        <p className="font-mono text-[12.5px] text-muted">Chargement...</p>
      </main>
    </>
  );
}

/** Les données n'ont pas pu être lues : on le dit, et on propose de réessayer. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <Ambient progress={0} />
      <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center p-6 text-center">
        <h1 className="display mb-3 text-[34px]">Connexion perdue</h1>
        <p className="mb-5 text-muted">
          Impossible de charger tes données. Vérifie ton réseau, puis réessaie.
        </p>
        <div>
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Réessayer
          </button>
        </div>
      </main>
    </>
  );
}

/** Le coach est connecté mais son créateur n'a pas encore créé son compte. */
export function NoCreatorYet() {
  return (
    <Panel className="mx-auto max-w-[520px] text-center">
      <h1 className="display mb-3 text-[30px]">En attente de ton créateur</h1>
      <p className="text-muted">
        Son suivi s'affichera ici dès qu'il aura créé son compte avec l'adresse que tu as invitée.
      </p>
    </Panel>
  );
}

/** Adresse inconnue : on reste dans le cadre du site et on propose de revenir à l'accueil. */
export function NotFoundScreen() {
  return (
    <Panel className="mx-auto max-w-[520px] text-center">
      <h1 className="display mb-3 text-[34px]">Page introuvable</h1>
      <p className="mb-5 text-muted">Cette adresse ne mène nulle part.</p>
      <Link className="btn btn--primary" to={HOME_PATH}>
        Revenir à l'accueil
      </Link>
    </Panel>
  );
}

/** Erreur inattendue pendant l'affichage : le cadre du site n'est plus fiable, on repart de zéro. */
export function CrashScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center p-6 text-center">
      <h1 className="display mb-3 text-[34px]">Quelque chose a cassé</h1>
      <p className="mb-5 text-muted">Recharge la page. Si ça recommence, préviens ton coach.</p>
      <div>
        <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
          Recharger
        </button>
      </div>
    </main>
  );
}
