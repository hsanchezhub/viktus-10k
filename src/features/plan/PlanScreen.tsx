import { useJourney } from "../../app/journey";
import { contenu } from "../../content";
import { formatNumber } from "../../lib/format";
import { ScreenHeader } from "../../ui/ScreenHeader";
import {
  AuditPanel,
  HighlightsPanel,
  MepPanel,
  MixPanel,
  PositioningPanel,
  RulesPanel,
  ThreadPanel,
  WeekPanel,
} from "./panels";
import { Phases } from "./Phases";

const { audit, trajectoireObjectif } = contenu.programme;
// « 645 → 10 000 » : le point de départ et l'objectif final, tels qu'écrits dans le contenu.
const journeyLabel = `${formatNumber(audit.followers)} → ${formatNumber(trajectoireObjectif.at(-1)?.abonnes ?? audit.followers)}`;

/** Le game plan complet : l'audit, les phases, le profil, le rythme et les règles. */
export function PlanScreen() {
  const { phase, followers } = useJourney();
  return (
    <>
      <ScreenHeader title="Le game plan" eyebrow={journeyLabel} />
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <AuditPanel className="lg:col-span-12" />
        <Phases
          className="lg:col-span-12 lg:my-4"
          currentPhase={phase.n}
          followers={followers.value}
        />
        <PositioningPanel className="lg:col-span-7" />
        <HighlightsPanel className="lg:col-span-5" />
        <MixPanel className="lg:col-span-5" />
        <WeekPanel className="lg:col-span-7" />
        <MepPanel className="lg:col-span-5" />
        <RulesPanel className="lg:col-span-7 lg:row-span-2" />
        <ThreadPanel className="lg:col-span-5" />
      </div>
    </>
  );
}
