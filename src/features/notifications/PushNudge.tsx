import { useId, useState } from "react";
import { BellIcon } from "../../ui/icons";
import { Panel } from "../../ui/Panel";
import { usePush } from "./usePush";

const DISMISSED_KEY = "viktus:push-nudge";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "later";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "later");
  } catch {
    // Stockage indisponible : l'invitation reviendra à la prochaine visite.
  }
}

interface PushNudgeProps {
  coachName: string;
  className?: string;
}

/**
 * Sur l'écran du créateur, tant que les notifications ne sont pas activées : une invitation
 * à le faire, ou à poser le site sur l'écran d'accueil si l'iPhone l'exige. Elle disparaît
 * une fois activée ou repoussée ; les réglages gardent le bouton.
 */
export function PushNudge({ coachName, className }: PushNudgeProps) {
  const push = usePush();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const titleId = useId();

  const needsInstall = push.status === "needs-install";
  const canEnable = push.status === "off";
  // Un refus reste affiché le temps d'être lu, même si le bouton n'a plus lieu d'être.
  if (dismissed || !(canEnable || needsInstall || push.failure)) return null;

  const dismiss = () => {
    rememberDismissal();
    setDismissed(true);
  };

  return (
    <Panel className={className} tone="quiet" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-[16px] font-extrabold">
        Ne rate aucun message de {coachName}
      </h2>
      <p className="mt-1 text-[14.5px] text-muted">
        {needsInstall
          ? "Pose d'abord le site sur ton écran d'accueil : dans Safari, touche Partager, puis « Sur l'écran d'accueil ». Ouvre-le ensuite depuis là pour activer les notifications."
          : "Active les notifications : tu reçois ses retours dès qu'il les envoie, ta to-do le matin et un rappel les jours de publication."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canEnable && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={push.busy}
            onClick={push.enable}
          >
            <BellIcon width={16} height={16} />
            Activer
          </button>
        )}
        <button type="button" className="btn" onClick={dismiss}>
          {canEnable || needsInstall ? "Plus tard" : "Compris"}
        </button>
      </div>
      {push.failure && (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-bad">
          {push.failure === "refused"
            ? "Tu n'as pas autorisé les notifications. Tu pourras changer d'avis depuis les réglages."
            : "Ça n'a pas marché. Réessaie, ou passe par les réglages."}
        </p>
      )}
    </Panel>
  );
}
