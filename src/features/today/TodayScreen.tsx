import { useId } from "react";
import { Link } from "react-router";
import { NoCreatorYet } from "../../app/Fallbacks";
import { type Journey, useJourney } from "../../app/journey";
import { complement, contenu } from "../../content";
import { formatLong } from "../../domain/dates";
import { dayNumber, weekOf } from "../../domain/phases";
import type { PlannedTask, TaskKind } from "../../domain/tasks";
import { formatNumber } from "../../lib/format";
import { FadeGauge } from "../../ui/FadeGauge";
import { Panel } from "../../ui/Panel";
import { TaskRow } from "../../ui/TaskRow";
import { CoachWord } from "./CoachWord";

const FIRSTS_SHOWN = 5;

const kindTag: Partial<Record<TaskKind, string>> = {
  post: "Publier",
  trial: "Essai",
  carousel: "Carrousel",
};

const helpLinks = {
  montage: { to: "/montage", label: "Comment monter" },
  idees: { to: "/idees", label: "Choisir un concept" },
  suivi: { to: "/suivi", label: "Ouvrir Suivi" },
  plan: { to: "/plan", label: "Voir dans le plan" },
} as const;

/** L'écran du matin : le jour, la to-do, les premières fois, l'objectif de la phase. */
export function TodayScreen() {
  const journey = useJourney();
  const { program } = journey.workspace;
  if (!program) return <NoCreatorYet />;

  const launched = journey.today >= journey.start;

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
      <Hero journey={journey} className="lg:col-span-12 lg:mb-2" />
      {journey.canEdit && (
        <CoachWord
          creatorId={program.creatorId}
          coachName={program.coachName}
          className="lg:col-span-12"
        />
      )}
      {launched && <DayTasks journey={journey} className="lg:col-span-7 lg:row-span-2" />}
      <PhaseGoal journey={journey} className={launched ? "lg:col-span-5" : "lg:col-span-6"} />
      <RemainingFirsts journey={journey} className={launched ? "lg:col-span-5" : "lg:col-span-6"} />
    </div>
  );
}

interface SectionProps {
  journey: Journey;
  className?: string;
}

function Hero({ journey, className }: SectionProps) {
  const { today, start, phase, streak } = journey;

  if (today < start) {
    return (
      <header className={className}>
        <p className="eyebrow">{formatLong(today)}</p>
        <h1 className="display mt-2 text-[42px] lg:text-[76px]">
          Le plan démarre <span className="text-accent">{formatLong(start)}</span>
        </h1>
        <p className="mt-3 max-w-[60ch] text-muted">{complement.aujourdhui.avantLancement}</p>
      </header>
    );
  }

  return (
    <header className={className}>
      <p className="eyebrow">
        {formatLong(today)} · semaine {weekOf(start, today)}
      </p>
      <h1 className="display mt-2 text-[56px] lg:text-[96px]">
        Jour <span className="text-accent">{dayNumber(start, today)}</span>
      </h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip chip--accent">
          Phase {phase.n} · {phase.name}
        </span>
        <span className="chip">
          Série : {streak} jour{streak > 1 ? "s" : ""}
        </span>
      </div>
    </header>
  );
}

/** La to-do du jour. En lecture seule pour le coach. */
export function DayTasks({ journey, className }: SectionProps) {
  const { today, canEdit } = journey;
  const tasks = journey.tasksOn(today);
  const done = journey.doneOn(today);
  const doneCount = tasks.filter((task) => done.has(task.id)).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;
  const titleId = useId();

  return (
    <Panel className={className} aria-labelledby={titleId}>
      {/* Journée validée : un reflet balaie le panneau quand la dernière case est cochée. */}
      {allDone && <span className="sweep" aria-hidden="true" />}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-[17px] font-extrabold lg:text-lg">
          {canEdit ? "Ta to-do du jour" : "La to-do du jour"}
        </h2>
        <p className="font-mono text-[13px] font-semibold text-muted tabular-nums">
          {doneCount}/{tasks.length}
        </p>
      </div>
      <FadeGauge
        value={tasks.length ? doneCount / tasks.length : 0}
        label={`${doneCount} tâches faites sur ${tasks.length}`}
      />
      <ul className="mt-2">
        {tasks.map((task) => (
          <DayTask
            key={task.id}
            task={task}
            checked={done.has(task.id)}
            disabled={!canEdit}
            onChange={(checked) => journey.toggleTask(task.id, checked)}
          />
        ))}
      </ul>
      {allDone && (
        <p className="mt-3">
          <span className="chip chip--good">Journée validée. Propre.</span>
        </p>
      )}
    </Panel>
  );
}

interface DayTaskProps {
  task: PlannedTask;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

function DayTask({ task, checked, disabled, onChange }: DayTaskProps) {
  const text = complement.taches[task.id];
  const help = text.lien ? helpLinks[text.lien] : null;
  return (
    <TaskRow
      label={text.titre}
      tag={kindTag[task.kind]}
      hint={text.aide}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      action={
        help && (
          <Link className="link" to={help.to}>
            {help.label}
          </Link>
        )
      }
    />
  );
}

function RemainingFirsts({ journey, className }: SectionProps) {
  const { tracking, canEdit } = journey;
  const all = contenu.premieresFois;
  const remaining = all.filter((first) => !tracking.firsts[first.id]);
  const titleId = useId();
  if (remaining.length === 0) return null;
  const doneCount = all.length - remaining.length;

  return (
    <Panel className={className} aria-labelledby={titleId}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-[17px] font-extrabold lg:text-lg">
          Les premières fois
        </h2>
        <p className="font-mono text-[13px] font-semibold text-muted tabular-nums">
          {doneCount}/{all.length}
        </p>
      </div>
      <p className="mb-3 text-[13.5px] text-muted">{complement.aujourdhui.premieresFois}</p>
      <FadeGauge
        value={doneCount / all.length}
        label={`${doneCount} premières fois faites sur ${all.length}`}
        thin
      />
      <ul className="mt-2">
        {remaining.slice(0, FIRSTS_SHOWN).map((first) => (
          <TaskRow
            key={first.id}
            label={first.titre}
            hint={first.aide || undefined}
            checked={false}
            disabled={!canEdit}
            onChange={(checked) => journey.toggleFirst(first.id, checked)}
          />
        ))}
      </ul>
    </Panel>
  );
}

function PhaseGoal({ journey, className }: SectionProps) {
  const { phase, followers, phaseProgress } = journey;
  const [from, to] = phase.goal;
  return (
    <Panel className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold lg:text-lg">Objectif de la phase</h2>
        <p className="font-mono text-[13px] font-semibold tabular-nums">
          {formatNumber(followers.value)} / {formatNumber(to)}
        </p>
      </div>
      <FadeGauge
        value={phaseProgress}
        label={`${formatNumber(followers.value)} abonnés, objectif ${formatNumber(to)}`}
      />
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted tabular-nums">
        <span>{formatNumber(from)}</span>
        <span>{formatNumber(to)} abonnés</span>
      </div>
      <p className="mt-3 text-[14px] text-muted">{phase.focus}</p>
      <p className="mt-2 text-[14px]">
        <b className="font-extrabold">Porte de sortie :</b> {phase.gate}.
      </p>
    </Panel>
  );
}
