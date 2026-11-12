import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { contenu } from "../content";
import type { Phase } from "../content/schema";
import {
  emptyTracking,
  type HookEntry,
  type NewHook,
  type Tracking,
  type Workspace,
} from "../data/backend";
import { useTrackingWrites } from "../data/queries";
import { type IsoDate, todayInParis } from "../domain/dates";
import { currentPhaseNumber, goalProgress, phaseByNumber, phaseOn } from "../domain/phases";
import { dayRatio, type Publications, streak, weekPublications } from "../domain/progress";
import { type PlannedTask, plannedTasks } from "../domain/tasks";

const REFRESH_MS = 60_000;
const NO_TASKS_DONE: ReadonlySet<string> = new Set();
const ignoreFailure = () => {};

/** Le jour qu'il est à Paris, remis à jour quand on passe minuit ou qu'on revient sur l'onglet. */
function useToday(): IsoDate {
  const [today, setToday] = useState(() => todayInParis());

  useEffect(() => {
    const refresh = () => setToday(todayInParis());
    const interval = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return today;
}

interface FollowerReading {
  value: number;
  day: IsoDate;
  /** Vrai tant qu'aucun relevé n'a été saisi : on affiche celui de l'audit. */
  fromAudit: boolean;
}

/** Où en est le créateur aujourd'hui, et de quoi modifier son suivi. */
export interface Journey {
  today: IsoDate;
  start: IsoDate;
  workspace: Workspace;
  /** Seul le créateur modifie son suivi. Le coach le lit. */
  canEdit: boolean;
  phase: Phase;
  tracking: Tracking;
  followers: FollowerReading;
  /** Chemin parcouru vers l'objectif de la phase, entre 0 et 1. */
  phaseProgress: number;
  tasksOn(date: IsoDate): PlannedTask[];
  doneOn(date: IsoDate): ReadonlySet<string>;
  streak: number;
  weekPublications: Publications;
  toggleTask(taskId: string, done: boolean): void;
  toggleFirst(key: string, done: boolean): void;
  saveFollowers(day: IsoDate, followers: number): Promise<unknown>;
  addHook(hook: NewHook): Promise<unknown>;
  deleteHook(hook: HookEntry): void;
}

const JourneyContext = createContext<Journey | null>(null);

function latestFollowers(tracking: Tracking): FollowerReading {
  const { audit, trajectoireObjectif } = contenu.programme;
  const lastDay = Object.keys(tracking.followers).sort().at(-1);
  const value = lastDay === undefined ? undefined : tracking.followers[lastDay];
  if (lastDay === undefined || value === undefined) {
    return { value: audit.followers, day: trajectoireObjectif[0]?.date ?? "", fromAudit: true };
  }
  return { value, day: lastDay, fromAudit: false };
}

interface JourneyProviderProps {
  workspace: Workspace;
  tracking: Tracking | undefined;
  children: ReactNode;
}

export function JourneyProvider({ workspace, tracking, children }: JourneyProviderProps) {
  const today = useToday();
  const { program, role } = workspace;
  const writes = useTrackingWrites(program?.creatorId ?? null);

  const journey = useMemo<Journey>(() => {
    const { phases, debut } = contenu.programme;
    const data = tracking ?? emptyTracking;
    const override = program?.phaseOverride ?? null;

    const tasksOn = (date: IsoDate) => plannedTasks(date, debut, phaseOn(phases, date, override));
    const doneOn = (date: IsoDate): ReadonlySet<string> =>
      data.days[date] ? new Set(data.days[date]) : NO_TASKS_DONE;

    const phase = phaseByNumber(phases, currentPhaseNumber(phases, debut, today, override));
    const followers = latestFollowers(data);

    return {
      today,
      start: debut,
      workspace,
      canEdit: role === "creator" && program !== null,
      phase,
      tracking: data,
      followers,
      phaseProgress: goalProgress(followers.value, phase.goal),
      tasksOn,
      doneOn,
      streak: streak(today, debut, (date) => dayRatio(tasksOn(date), doneOn(date))),
      weekPublications: weekPublications(today, tasksOn, doneOn),

      // Cases à cocher : un échec est déjà signalé par un message, rien d'autre à faire ici.
      toggleTask(taskId, done) {
        const current = data.days[today] ?? [];
        const next = done
          ? [...new Set([...current, taskId])]
          : current.filter((id) => id !== taskId);
        writes.saveDay(today, next).catch(ignoreFailure);
      },
      toggleFirst(key, done) {
        writes.setFirst(key, done ? today : null).catch(ignoreFailure);
      },
      saveFollowers: writes.saveFollowers,
      addHook: writes.addHook,
      deleteHook(hook) {
        writes.deleteHook(hook).catch(ignoreFailure);
      },
    };
  }, [today, workspace, role, program, tracking, writes]);

  return <JourneyContext value={journey}>{children}</JourneyContext>;
}

export function useJourney(): Journey {
  const journey = useContext(JourneyContext);
  if (!journey) throw new Error("useJourney doit être utilisé sous JourneyProvider");
  return journey;
}
