import { useEffect, useId, useState } from "react";
import type { CoachMessage } from "../../data/backend";
import { useMarkMessagesRead, useMessages } from "../../data/queries";
import { formatMoment } from "../../domain/dates";
import { Panel } from "../../ui/Panel";
import { Sheet } from "../../ui/Sheet";

interface CoachWordProps {
  creatorId: string;
  coachName: string;
  className?: string;
}

/**
 * Le dernier message du coach, en haut de l'écran du créateur, avec l'historique à la demande.
 * Tant qu'il n'y a aucun message, le bloc n'apparaît pas.
 */
export function CoachWord({ creatorId, coachName, className }: CoachWordProps) {
  const messages = useMessages(creatorId);
  const { mutate: markRead } = useMarkMessagesRead(creatorId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const titleId = useId();

  const list: CoachMessage[] = messages.data ?? [];
  const unreadIds = list.filter((message) => message.readAt === null).map((message) => message.id);
  const hasUnread = unreadIds.length > 0;

  // Les messages pas encore lus à leur arrivée gardent leur étiquette « Nouveau » pendant la
  // visite, même une fois signalés comme lus au coach.
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  if (unreadIds.some((id) => !freshIds.has(id))) {
    setFreshIds(new Set([...freshIds, ...unreadIds]));
  }

  // Affichés, donc vus : le coach le saura.
  useEffect(() => {
    if (hasUnread) markRead();
  }, [hasUnread, markRead]);

  const latest = list[0];
  if (!latest) return null;
  const isFresh = freshIds.has(latest.id);

  return (
    <>
      <Panel className={className} tone={isFresh ? "lit" : "default"} aria-labelledby={titleId}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={titleId} className="eyebrow !text-accent-text">
            Le mot de {coachName}
          </h2>
          {isFresh && <span className="chip chip--accent">Nouveau</span>}
          <p className="ml-auto font-mono text-[11.5px] text-muted">
            {formatMoment(latest.createdAt)}
          </p>
        </div>
        <p className="mt-2 whitespace-pre-wrap">{latest.body}</p>
        {list.length > 1 && (
          <p className="mt-3 text-[14px]">
            <button type="button" className="link" onClick={() => setHistoryOpen(true)}>
              Tous les messages ({list.length})
            </button>
          </p>
        )}
      </Panel>

      <Sheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Messages de ${coachName}`}
      >
        <ul className="flex flex-col gap-3">
          {list.map((message) => (
            <li key={message.id} className="well p-4">
              <p className="font-mono text-[11.5px] text-muted">
                {formatMoment(message.createdAt)}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap">{message.body}</p>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
