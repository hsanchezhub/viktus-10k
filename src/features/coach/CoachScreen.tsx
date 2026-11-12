import { type FormEvent, useId, useState } from "react";
import { type Journey, useJourney } from "../../app/journey";
import { contenu } from "../../content";
import type { Program } from "../../data/backend";
import { useAccount } from "../../data/context";
import { useCoachWrites, useMessages } from "../../data/queries";
import {
  diffDays,
  formatLong,
  formatMoment,
  formatShort,
  type IsoDate,
  parisDayOf,
} from "../../domain/dates";
import { completionOver, dayRatio, INACTIVITY_ALERT_DAYS, lastDays } from "../../domain/progress";
import { isWinningHook, targetAt } from "../../domain/target";
import { formatNumber } from "../../lib/format";
import { SendIcon, TrashIcon } from "../../ui/icons";
import { Panel, PanelTitle } from "../../ui/Panel";
import { ScreenHeader } from "../../ui/ScreenHeader";
import { StatTile } from "../../ui/StatTile";
import { useToast } from "../../ui/Toast";
import { DayTasks } from "../today/TodayScreen";
import { InvitePanel } from "./InvitePanel";

const MESSAGE_MAX_LENGTH = 2000;
const HEATMAP_DAYS = 28;
const LATEST_HOOKS = 5;

const { phases, trajectoireObjectif, audit } = contenu.programme;
const { premieresFois } = contenu;

/** Le tableau de bord du coach : où en est son créateur, et de quoi lui écrire. */
export function CoachScreen() {
  const journey = useJourney();
  const account = useAccount();
  const { program } = journey.workspace;
  if (!account) return null;

  return (
    <>
      <ScreenHeader
        title="Coach"
        eyebrow={program ? `Le suivi de ${program.creatorName}` : "Ton espace"}
      />
      {program ? (
        <Dashboard journey={journey} program={program} coachId={account.userId} />
      ) : (
        <InvitePanel coachId={account.userId} />
      )}
    </>
  );
}

interface DashboardProps {
  journey: Journey;
  program: Program;
  coachId: string;
}

function Dashboard({ journey, program, coachId }: DashboardProps) {
  const { today, start } = journey;
  const launched = today >= start;

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
      <KeyFigures journey={journey} className="lg:col-span-12" />
      <Messages program={program} coachId={coachId} className="lg:col-span-7" />
      {launched ? (
        <DayTasks journey={journey} className="lg:col-span-5" />
      ) : (
        <Panel className="lg:col-span-5">
          <PanelTitle>La to-do du jour</PanelTitle>
          <p className="text-muted">Le programme démarre {formatLong(start)}.</p>
        </Panel>
      )}
      <Heatmap journey={journey} className="lg:col-span-5" />
      <div className="flex flex-col gap-4 lg:col-span-7 lg:gap-5">
        <PhaseSetting journey={journey} program={program} coachId={coachId} />
        <LatestHooks journey={journey} />
      </div>
    </div>
  );
}

function activityLabel(lastActivityAt: string | null, today: IsoDate) {
  if (!lastActivityAt) return { value: "Jamais", idleDays: null };
  const idleDays = Math.max(0, diffDays(parisDayOf(lastActivityAt), today));
  const value = idleDays === 0 ? "Aujourd'hui" : idleDays === 1 ? "Hier" : `Il y a ${idleDays} j`;
  return { value, idleDays };
}

function KeyFigures({ journey, className }: { journey: Journey; className?: string }) {
  const { today, start, tracking, followers, streak, weekPublications, tasksOn, doneOn } = journey;

  const week = completionOver(
    lastDays(today, 7).filter((day) => day >= start),
    tasksOn,
    doneOn,
  );
  const target = targetAt(followers.day, trajectoireObjectif);
  const firstsDone = premieresFois.filter((first) => tracking.firsts[first.id]).length;
  const activity = activityLabel(tracking.lastActivityAt, today);
  const needsNudge = activity.idleDays !== null && activity.idleDays >= INACTIVITY_ALERT_DAYS;

  return (
    <dl className={`grid grid-cols-2 gap-3 lg:grid-cols-6 lg:gap-4 ${className ?? ""}`}>
      <StatTile value={String(streak)} label="jours de série" />
      <StatTile
        value={`${week.total ? Math.round((week.done / week.total) * 100) : 0} %`}
        label="tâches faites sur 7 jours"
        detail={`${week.done} sur ${week.total}`}
      />
      <StatTile
        value={`${weekPublications.done}/${weekPublications.planned}`}
        label="publications cette semaine"
      />
      <StatTile
        value={formatNumber(followers.value)}
        label={`abonnés (${formatShort(followers.day)})`}
        detail={`objectif à cette date : ${formatNumber(target)}`}
        tone={followers.value >= target ? "good" : "warn"}
      />
      <StatTile value={`${firstsDone}/${premieresFois.length}`} label="premières fois" />
      <StatTile
        value={activity.value}
        label="dernière activité"
        detail={needsNudge ? "Relance-le" : undefined}
        tone="bad"
      />
    </dl>
  );
}

interface MessagesProps {
  program: Program;
  coachId: string;
  className?: string;
}

function Messages({ program, coachId, className }: MessagesProps) {
  const showToast = useToast();
  const messages = useMessages(program.creatorId);
  const { sendMessage, deleteMessage } = useCoachWrites(program.creatorId, coachId);
  const [draft, setDraft] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const titleId = useId();
  const fieldId = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (body === "") return setFailure("Écris ton message avant de l'envoyer.");
    setFailure(null);
    try {
      await sendMessage.mutateAsync(body);
      setDraft("");
      showToast("Message envoyé");
    } catch {
      setFailure("Le message n'est pas parti. Vérifie ta connexion et réessaie.");
    }
  }

  return (
    <Panel className={className} aria-labelledby={titleId}>
      <PanelTitle id={titleId}>{`Tes messages à ${program.creatorName}`}</PanelTitle>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor={fieldId}>Ton retour</label>
          <textarea
            id={fieldId}
            className="input min-h-[120px] resize-y py-3 leading-normal"
            maxLength={MESSAGE_MAX_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        {failure && (
          <p role="alert" className="text-[14px] font-semibold text-bad">
            {failure}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn--primary" disabled={sendMessage.isPending}>
            <SendIcon width={16} height={16} />
            {sendMessage.isPending ? "Envoi..." : "Envoyer"}
          </button>
          <p className="text-[13px] text-muted">
            {program.creatorName} le voit en haut de son écran Aujourd'hui.
          </p>
        </div>
      </form>

      {messages.isError && (
        <p className="mt-4 text-[14px] text-muted">
          Impossible de charger tes messages pour l'instant.
        </p>
      )}
      {messages.data?.length === 0 && (
        <p className="well mt-4 p-4 text-center text-[14px] text-muted">
          Aucun message pour l'instant. Le premier que tu envoies s'affichera ici.
        </p>
      )}
      {messages.data && messages.data.length > 0 && (
        <ul className="mt-4">
          {messages.data.map((message) => (
            <li
              key={message.id}
              className="flex items-start gap-3 border-t border-[var(--well-line)] py-3 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted">
                  <span>{formatMoment(message.createdAt)}</span>
                  {message.readAt ? (
                    <span className="chip chip--good">Lu</span>
                  ) : (
                    <span className="chip chip--muted">Pas encore lu</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--icon flex-none"
                onClick={() => deleteMessage.mutate(message.id)}
                aria-label="Supprimer ce message"
              >
                <TrashIcon width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Heatmap({ journey, className }: { journey: Journey; className?: string }) {
  const { today, start, tasksOn, doneOn } = journey;
  const days = lastDays(today, HEATMAP_DAYS);

  return (
    <Panel className={className}>
      <PanelTitle>Ses 28 derniers jours</PanelTitle>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const ratio = day >= start ? dayRatio(tasksOn(day), doneOn(day)) : null;
          const percent = ratio === null ? null : Math.round(ratio * 100);
          return (
            <li
              key={day}
              className="grid aspect-square place-items-center rounded-[9px] font-mono text-[11px] tabular-nums"
              style={
                ratio === null
                  ? { boxShadow: "inset 0 0 0 1px var(--well-line)", color: "var(--muted)" }
                  : {
                      background: `rgb(var(--halo-rgb) / ${(0.1 + ratio * 0.8).toFixed(2)})`,
                      color: ratio >= 0.75 ? "var(--accent-ink)" : "var(--fg)",
                    }
              }
              title={percent === null ? formatLong(day) : `${formatLong(day)} : ${percent} %`}
              aria-label={
                percent === null
                  ? `${formatLong(day)}, hors programme`
                  : `${formatLong(day)}, ${percent} % fait`
              }
            >
              {Number(day.slice(-2))}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[13px] text-muted">
        Plus la case est rose, plus la to-do du jour a été faite.
      </p>
    </Panel>
  );
}

function PhaseSetting({ journey, program, coachId }: DashboardProps) {
  const showToast = useToast();
  const { setPhaseOverride } = useCoachWrites(program.creatorId, coachId);
  const { today, phase } = journey;
  const current = program.phaseOverride;
  const [choice, setChoice] = useState(current?.phase ?? 0);
  const fieldId = useId();
  const unchanged = choice === (current?.phase ?? 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      // La phase forcée court à partir d'aujourd'hui : les jours passés ne changent pas.
      await setPhaseOverride.mutateAsync(choice === 0 ? null : { phase: choice, from: today });
      showToast("Phase enregistrée");
    } catch {
      showToast("Pas enregistré. Vérifie ta connexion et réessaie.");
    }
  }

  return (
    <Panel>
      <PanelTitle>La phase en cours</PanelTitle>
      <p className="mb-3 text-[14px] text-muted">
        {current
          ? `Phase ${current.phase} forcée depuis le ${formatShort(current.from)}.`
          : `Phase ${phase.n}, d'après le calendrier.`}{" "}
        Si tu la forces, la to-do de {program.creatorName} suit ce rythme à partir d'aujourd'hui.
        Les jours passés ne changent pas.
      </p>
      <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <div className="field min-w-[220px] flex-1">
          <label htmlFor={fieldId}>Phase</label>
          <select
            id={fieldId}
            className="input"
            value={choice}
            onChange={(event) => setChoice(Number(event.target.value))}
          >
            <option value={0}>Automatique, selon le calendrier</option>
            {phases.map((option) => (
              <option key={option.n} value={option.n}>
                Phase {option.n} · {option.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={unchanged || setPhaseOverride.isPending}
        >
          Enregistrer
        </button>
      </form>
    </Panel>
  );
}

function LatestHooks({ journey }: { journey: Journey }) {
  const hooks = journey.tracking.hooks
    .toSorted((a, b) => b.day.localeCompare(a.day))
    .slice(0, LATEST_HOOKS);

  return (
    <Panel>
      <PanelTitle>Ses derniers hooks</PanelTitle>
      {hooks.length === 0 ? (
        <p className="text-[14px] text-muted">Rien dans le carnet pour l'instant.</p>
      ) : (
        <ul>
          {hooks.map((hook) => (
            <li
              key={hook.id}
              className="flex items-baseline justify-between gap-3 border-t border-[var(--well-line)] py-2.5 first:border-t-0"
            >
              <p className="min-w-0">
                <span className="font-bold">{hook.hook}</span>{" "}
                {isWinningHook(hook.views, audit.median12) && (
                  <span className="chip chip--good ml-1">gagnant</span>
                )}
              </p>
              <p className="flex-none font-mono text-[12.5px] text-muted tabular-nums">
                {formatShort(hook.day)}
                {hook.views !== null && ` · ${formatNumber(hook.views)} vues`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
