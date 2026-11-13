import { BellIcon } from "../../ui/icons";
import type { PushStatus } from "./push";
import { type PushFailure, usePush } from "./usePush";

const failureText: Record<PushFailure, string> = {
  refused: "Tu n'as pas autorisé les notifications. Tu peux réessayer quand tu veux.",
  "not-ready": "Les notifications ne sont pas encore prêtes. Réessaie un peu plus tard.",
  failed: "Ça n'a pas marché. Vérifie ta connexion et réessaie.",
};

/** Ce que l'écran explique quand il n'y a pas de bouton à proposer. */
const explanation: Partial<Record<PushStatus, string>> = {
  "needs-install":
    "Sur iPhone, pose d'abord le site sur ton écran d'accueil (explications juste en dessous), puis ouvre-le depuis là pour activer les notifications.",
  blocked:
    "Les notifications sont bloquées pour ce site. Autorise-les dans les réglages de ton téléphone, puis reviens ici.",
  unsupported: "Ce navigateur ne sait pas recevoir les notifications de ce site.",
};

/** Dans les réglages du créateur : activer ou couper les notifications sur cet appareil. */
export function PushSettings({ coachName }: { coachName: string }) {
  const push = usePush();
  if (push.status === undefined) return null;
  const on = push.status === "on";

  return (
    <section className="well p-4">
      <p className="eyebrow">Notifications</p>
      <p className="mt-1 text-[14px] text-muted">
        {explanation[push.status] ??
          (on
            ? `Activées sur cet appareil. Tu reçois les messages de ${coachName} et tes rappels.`
            : `Reçois les messages de ${coachName}, ta to-do du matin et un rappel les jours de publication.`)}
      </p>
      {(on || push.status === "off") && (
        <button
          type="button"
          className="btn mt-3"
          disabled={push.busy}
          onClick={on ? push.disable : push.enable}
        >
          <BellIcon width={16} height={16} />
          {on ? "Couper les notifications" : "Activer les notifications"}
        </button>
      )}
      {push.failure && (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-bad">
          {failureText[push.failure]}
        </p>
      )}
    </section>
  );
}
