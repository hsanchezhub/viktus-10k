import { type ReactNode, useId } from "react";
import { NoCreatorYet } from "../../app/Fallbacks";
import { type Journey, useJourney } from "../../app/journey";
import { complement, contenu } from "../../content";
import type { HookEntry } from "../../data/backend";
import { formatShort } from "../../domain/dates";
import { isWinningHook, winningViews } from "../../domain/target";
import { formatNumber } from "../../lib/format";
import { TrashIcon } from "../../ui/icons";
import { Panel, PanelTitle } from "../../ui/Panel";
import { ScreenHeader } from "../../ui/ScreenHeader";
import { StatTile } from "../../ui/StatTile";
import { TaskRow } from "../../ui/TaskRow";
import { FollowersChart } from "./FollowersChart";
import { FollowersForm, HookForm } from "./forms";

const { audit } = contenu.programme;

/** Le suivi : abonnés contre objectif, carnet des hooks, premières fois, revue du mois. */
export function TrackingScreen() {
  const journey = useJourney();
  const { program } = journey.workspace;
  if (!program) return <NoCreatorYet />;

  const { canEdit, followers, streak, weekPublications, tracking, today } = journey;

  return (
    <>
      <ScreenHeader
        title={canEdit ? "Ton suivi" : "Le suivi"}
        eyebrow={
          canEdit ? `${program.coachName} le voit aussi` : `Le suivi de ${program.creatorName}`
        }
      />

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <dl className="grid grid-cols-3 gap-3 lg:col-span-12 lg:gap-5">
          <StatTile
            value={formatNumber(followers.value)}
            label="abonnés"
            detail={
              followers.fromAudit ? "audit du 12 nov." : `relevé du ${formatShort(followers.day)}`
            }
          />
          <StatTile
            value={String(streak)}
            label="jours de série"
            detail="journées à 60 % ou plus"
          />
          <StatTile
            value={`${weekPublications.done}/${weekPublications.planned}`}
            label="publications cette semaine"
            detail="reels et essais"
          />
        </dl>

        <Panel className="lg:col-span-7">
          <PanelTitle>{canEdit ? "Ta courbe vers 10K" : "La courbe vers 10K"}</PanelTitle>
          <FollowersChart readings={tracking.followers} />
          {canEdit && (
            <FollowersForm
              today={today}
              lastValue={followers.value}
              onSave={journey.saveFollowers}
            />
          )}
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelTitle>Les premières fois</PanelTitle>
          <ul>
            {contenu.premieresFois.map((first) => (
              <TaskRow
                key={first.id}
                label={first.titre}
                checked={Boolean(tracking.firsts[first.id])}
                disabled={!canEdit}
                onChange={(checked) => journey.toggleFirst(first.id, checked)}
              />
            ))}
          </ul>
        </Panel>

        <HookJournal journey={journey} className="lg:col-span-7" />

        <Panel className="lg:col-span-5">
          <PanelTitle>La revue du 1er du mois (20 min)</PanelTitle>
          <ol className="steps text-[14.5px]">
            {complement.suivi.revueDuMois.map((step) => (
              <li key={step}>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

function HookJournal({ journey, className }: { journey: Journey; className?: string }) {
  const { canEdit, tracking, today } = journey;
  const hooks = tracking.hooks.toSorted((a, b) => b.day.localeCompare(a.day));
  const titleId = useId();

  return (
    <Panel className={className} aria-labelledby={titleId}>
      <PanelTitle id={titleId}>Le carnet des hooks</PanelTitle>
      <p className="mb-4 text-[14px] text-muted">{complement.suivi.carnet}</p>
      {canEdit && <HookForm today={today} onAdd={journey.addHook} />}

      {hooks.length === 0 ? (
        <p className="well mt-4 p-4 text-center text-[14px] text-muted">
          Le premier reel noté apparaîtra ici. Un hook gagnant (2 fois la médiane, soit environ{" "}
          {formatNumber(winningViews(audit.median12))} vues) est marqué automatiquement.
        </p>
      ) : (
        <ul className="mt-4">
          {hooks.map((hook) => (
            <HookRow
              key={hook.id}
              hook={hook}
              onDelete={canEdit ? () => journey.deleteHook(hook) : undefined}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function HookRow({ hook, onDelete }: { hook: HookEntry; onDelete?: () => void }) {
  return (
    <li className="flex items-start gap-3 border-t border-[var(--well-line)] py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {hook.hook}{" "}
          {hook.kind === "essai" && <span className="chip chip--accent ml-1">essai</span>}
          {hook.kind === "carrousel" && <span className="chip ml-1">carrousel</span>}
          {isWinningHook(hook.views, audit.median12) && (
            <span className="chip chip--good ml-1">gagnant</span>
          )}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 font-mono text-[12.5px] text-muted tabular-nums">
          <span>{formatShort(hook.day)}</span>
          <Count value={hook.views}>vues</Count>
          <Count value={hook.shares}>partages</Count>
          <Count value={hook.follows}>abonnés</Count>
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          className="btn btn--icon flex-none"
          onClick={onDelete}
          aria-label={`Supprimer « ${hook.hook} » du carnet`}
        >
          <TrashIcon width={18} height={18} />
        </button>
      )}
    </li>
  );
}

function Count({ value, children }: { value: number | null; children: ReactNode }) {
  if (value === null) return null;
  return (
    <span>
      {formatNumber(value)} {children}
    </span>
  );
}
