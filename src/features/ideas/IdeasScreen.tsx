import { motion } from "motion/react";
import { useSearchParams } from "react-router";
import { useJourney } from "../../app/journey";
import { complement, contenu } from "../../content";
import { goalKeys } from "../../content/goals";
import type { Concept, TrialReel } from "../../content/schema";
import { CopyButton } from "../../ui/CopyButton";
import { Panel } from "../../ui/Panel";
import { ScreenHeader } from "../../ui/ScreenHeader";
import { conceptsFor, type IdeaFilter, isAvailable, parseFilter, stripQuotes } from "./concepts";

const FILTER_PARAM = "but";

const filters: ReadonlyArray<{ key: IdeaFilter; label: string }> = [
  { key: "all", label: "Tous" },
  ...goalKeys.map((key) => ({ key, label: contenu.buts[key] })),
  { key: "ess", label: contenu.buts.ess },
];

/** La banque d'idées : 21 concepts filtrables par but, et les 8 réels d'essai. */
export function IdeasScreen() {
  const { phase } = useJourney();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseFilter(searchParams.get(FILTER_PARAM));

  function selectFilter(next: IdeaFilter) {
    // Le filtre vit dans l'adresse : il survit au rechargement et au bouton retour.
    setSearchParams(next === "all" ? {} : { [FILTER_PARAM]: next }, {
      replace: true,
      preventScrollReset: true,
    });
  }

  return (
    <>
      <ScreenHeader title="Les idées" eyebrow="Tu ne te demandes plus quoi poster" />

      <div className="mb-4 flex flex-wrap gap-x-1" role="group" aria-label="Filtrer par but">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className="filter"
            aria-pressed={filter === key}
            onClick={() => selectFilter(key)}
          >
            {filter === key && (
              <motion.span
                layoutId="filter-pill"
                className="filter__pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {label}
          </button>
        ))}
      </div>

      <motion.div
        key={filter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {filter === "ess" ? (
          <>
            <p className="mb-4 max-w-[70ch] text-[14.5px] text-muted">
              {complement.idees.introEssais}
            </p>
            <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
              {contenu.reelsEssai.map((trial, index) => (
                <li key={trial.titre} className="flex">
                  <TrialCard trial={trial} number={index + 1} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
            {conceptsFor(contenu.concepts, filter, phase.n).map((concept) => (
              <li key={concept.titre} className="flex">
                <ConceptCard concept={concept} available={isAvailable(concept, phase.n)} />
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </>
  );
}

function ConceptCard({ concept, available }: { concept: Concept; available: boolean }) {
  return (
    <Panel
      as="article"
      tone={available ? "default" : "quiet"}
      className="flex flex-1 flex-col gap-3"
    >
      <div className="flex flex-wrap gap-1.5">
        <span className="chip chip--accent">{contenu.buts[concept.but]}</span>
        <span className={available ? "chip" : "chip chip--muted"}>
          {available ? "Dispo maintenant" : `Dès la phase ${concept.desLaPhase}`}
        </span>
      </div>
      <h3 className="font-extrabold">{concept.titre}</h3>
      <p className="display text-[23px] leading-[1.1]">{concept.hook}</p>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
        <dt className="font-semibold text-muted">Plans</dt>
        <dd>{concept.plans}</dd>
        <dt className="font-semibold text-muted">Légende</dt>
        <dd>{concept.legende}</dd>
        {concept.note && (
          <>
            <dt className="font-semibold text-muted">Note</dt>
            <dd className="text-muted">{concept.note}</dd>
          </>
        )}
      </dl>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <CopyButton text={concept.hook} label="Copier le hook" compact />
        <CopyButton text={concept.legende} label="Copier la légende" compact />
      </div>
    </Panel>
  );
}

function TrialCard({ trial, number }: { trial: TrialReel; number: number }) {
  return (
    <Panel as="article" className="flex flex-1 flex-col gap-3">
      <div>
        <span className="chip chip--accent">Essai {number}</span>
      </div>
      <h3 className="font-extrabold">{trial.titre}</h3>
      <p className="display text-[23px] leading-[1.1]">{trial.hook}</p>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[14px]">
        <dt className="font-semibold text-muted">Déroulé</dt>
        <dd>{trial.deroule}</dd>
        <dt className="font-semibold text-muted">CTA</dt>
        <dd>{trial.cta}</dd>
      </dl>
      <div className="mt-auto pt-1">
        <CopyButton text={stripQuotes(trial.hook)} label="Copier le hook" />
      </div>
    </Panel>
  );
}
