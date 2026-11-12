import { contenu } from "../../content";
import type { Phase } from "../../content/schema";
import { formatShort, yearOf } from "../../domain/dates";
import { formatNumber } from "../../lib/format";
import { FadeGauge } from "../../ui/FadeGauge";
import { GateIcon } from "../../ui/icons";
import { Panel } from "../../ui/Panel";
import { SectionTitle } from "../../ui/ScreenHeader";

interface PhasesProps {
  currentPhase: number;
  followers: number;
  className?: string;
}

/** La route complète : où en est Victor, puis les quatre phases et les portes qui les séparent. */
export function Phases({ currentPhase, followers, className }: PhasesProps) {
  const { phases } = contenu.programme;
  return (
    <section className={className} aria-labelledby="titre-phases">
      <SectionTitle id="titre-phases">Les 4 phases</SectionTitle>
      <Road followers={followers} phases={phases} />
      {/* Sur ordinateur, chaque colonne est une sous-grille : les 4 cartes gardent la même
          hauteur et les portes s'alignent sur une même ligne en dessous. */}
      <ol className="mt-4 grid gap-3 lg:grid-cols-4 lg:gap-4">
        {phases.map((phase, index) => (
          <li
            key={phase.n}
            className="flex flex-col gap-3 lg:row-span-2 lg:grid lg:grid-rows-subgrid"
          >
            <PhaseCard phase={phase} current={phase.n === currentPhase} />
            {index < phases.length - 1 && (
              <p className="flex items-start gap-2.5 px-1 text-[13.5px] text-muted lg:px-2">
                <GateIcon className="mt-0.5 flex-none text-accent-text" width={14} height={14} />
                <span>
                  <b className="font-extrabold text-fg">Porte {phase.n} :</b> {phase.gate}
                </span>
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Road({ followers, phases }: { followers: number; phases: readonly Phase[] }) {
  const finalGoal = phases.at(-1)?.goal[1] ?? followers;
  return (
    <Panel as="div">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="eyebrow">La route vers {formatNumber(finalGoal)}</p>
        <p className="font-mono text-[13px] font-semibold tabular-nums">
          {formatNumber(followers)} / {formatNumber(finalGoal)}
        </p>
      </div>
      <FadeGauge
        value={followers / finalGoal}
        label={`${formatNumber(followers)} abonnés sur ${formatNumber(finalGoal)}`}
      />
      <div
        className="relative mt-2 h-4 font-mono text-[11px] text-muted tabular-nums"
        aria-hidden="true"
      >
        {phases.map((phase) => {
          const position = (phase.goal[1] / finalGoal) * 100;
          const isEnd = phase.goal[1] === finalGoal;
          return (
            <span
              key={phase.n}
              className="absolute top-0 whitespace-nowrap"
              style={isEnd ? { right: 0 } : { left: `${position}%`, transform: "translateX(-50%)" }}
            >
              {formatNumber(phase.goal[1])}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

function PhaseCard({ phase, current }: { phase: Phase; current: boolean }) {
  return (
    <Panel
      as="article"
      tone={current ? "lit" : "default"}
      className="flex-1"
      aria-current={current ? "step" : undefined}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p
          className={current ? "display text-[44px] text-accent" : "display text-[44px] text-muted"}
        >
          {phase.n}
        </p>
        {current && <span className="chip chip--accent">En cours</span>}
      </div>
      <h3 className="mb-3 text-[17px] font-extrabold">{phase.name}</h3>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13.5px] lg:grid-cols-1 lg:gap-y-0.5">
        <dt className="font-semibold text-muted">Dates</dt>
        <dd className="lg:mb-2">
          {formatShort(phase.from)} au {formatShort(phase.to)} {yearOf(phase.to)}
        </dd>
        <dt className="font-semibold text-muted">Objectif</dt>
        <dd className="tabular-nums lg:mb-2">
          {formatNumber(phase.goal[0])} → {formatNumber(phase.goal[1])} abonnés
        </dd>
        <dt className="font-semibold text-muted">Rythme</dt>
        <dd className="lg:mb-2">{phase.cadence}</dd>
        <dt className="font-semibold text-muted">Focus</dt>
        <dd>{phase.focus}</dd>
      </dl>
    </Panel>
  );
}
