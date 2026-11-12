import type { ReactNode } from "react";
import { complement, contenu } from "../../content";
import { cx } from "../../lib/cx";
import { formatNumber } from "../../lib/format";
import { CopyBox } from "../../ui/CopyBox";
import { CountUp } from "../../ui/CountUp";
import { Emphasis } from "../../ui/Emphasis";
import { FadeGauge } from "../../ui/FadeGauge";
import { ExternalIcon } from "../../ui/icons";
import { Panel, PanelTitle } from "../../ui/Panel";

const { plan } = complement;

interface PanelSlot {
  className?: string;
}

export function AuditPanel({ className }: PanelSlot) {
  const { audit } = contenu.programme;
  return (
    <Panel className={cx("lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8", className)}>
      {/* Sur ordinateur, le titre reste en haut et les chiffres s'ancrent en bas du panneau. */}
      <div className="lg:flex lg:flex-col lg:justify-between">
        <PanelTitle>{plan.audit.titre}</PanelTitle>
        <dl className="grid grid-cols-3 gap-3 lg:gap-5">
          <Stat label="abonnés">
            <CountUp value={audit.followers} />
          </Stat>
          <Stat label="vues médianes par reel">
            <CountUp value={audit.median} />
          </Stat>
          <Stat label="abonné gagné par vue">1/{formatNumber(audit.perFollower)}</Stat>
        </dl>
      </div>
      <ul className="bullets mt-5 text-[14.5px] lg:mt-0">
        {plan.audit.points.map((point) => (
          <li key={point.fort}>
            <Emphasis {...point} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-1.5">
      <dt className="text-[12.5px] leading-tight font-semibold text-muted">{label}</dt>
      <dd className="display text-[34px] lg:text-[56px]">{children}</dd>
    </div>
  );
}

export function PositioningPanel({ className }: PanelSlot) {
  const { positionnement } = plan;
  return (
    <Panel className={className}>
      <PanelTitle>Ton positionnement</PanelTitle>
      <p className="text-[14.5px]">
        <b className="font-extrabold">{positionnement.fort}</b> {positionnement.texte}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <CopyBox label="Nom de profil (recherchable)" text={positionnement.nomProfil} />
        <CopyBox label={`Bio (${positionnement.noteBio})`} text={positionnement.bio} />
        <p className="text-[13.5px] text-muted">{positionnement.noteLien}</p>
      </div>
    </Panel>
  );
}

export function HighlightsPanel({ className }: PanelSlot) {
  return (
    <Panel className={className}>
      <PanelTitle>Tes stories à la une : de 10 à 5</PanelTitle>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col" className="eyebrow">
              À la une
            </th>
            <th scope="col" className="eyebrow">
              Ce qu'on y met
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.aLaUne.map((highlight) => (
            <tr key={highlight.titre}>
              <th scope="row" className="font-extrabold whitespace-nowrap">
                {highlight.titre}
              </th>
              <td>{highlight.contenu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function MixPanel({ className }: PanelSlot) {
  // Les jauges sont à l'échelle du but le plus présent, pour que la plus grande soit pleine.
  const largestShare = Math.max(...plan.mix.map((line) => line.part));
  return (
    <Panel className={className}>
      <PanelTitle>Le mix des 5 buts SPARTA</PanelTitle>
      <ul className="flex flex-col gap-3.5">
        {plan.mix.map((line) => (
          <li key={line.but}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="font-extrabold">{line.but}</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums">
                {line.part} %
              </span>
            </div>
            <FadeGauge
              value={line.part / largestShare}
              label={`${line.but} : ${line.part} %`}
              thin
            />
            <p className="mt-1.5 text-[13px] text-muted">{line.exemples}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function WeekPanel({ className }: PanelSlot) {
  const { semaineType } = plan;
  return (
    <Panel className={className}>
      <PanelTitle>{semaineType.titre}</PanelTitle>
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col" className="eyebrow">
              Jour
            </th>
            <th scope="col" className="eyebrow">
              Publier
            </th>
            <th scope="col" className="eyebrow">
              Au salon
            </th>
          </tr>
        </thead>
        <tbody>
          {semaineType.jours.map((day) => (
            <tr key={day.jour}>
              <th scope="row" className="font-semibold">
                {day.jour}
              </th>
              <td
                className={cx(!day.publier && "text-muted", day.reelPrincipal && "font-extrabold")}
              >
                {day.publier ?? "Rien"}
              </td>
              <td>{day.salon}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[13.5px] text-muted">{semaineType.note}</p>
    </Panel>
  );
}

export function MepPanel({ className }: PanelSlot) {
  return (
    <Panel className={className}>
      <PanelTitle>Stories et méthode MEP</PanelTitle>
      <p className="mb-4 text-[14.5px]">{plan.mep.intro}</p>
      <ol className="steps text-[14.5px]">
        {plan.mep.etapes.map((step) => (
          <li key={step.fort}>
            <span>
              <Emphasis {...step} />
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function RulesPanel({ className }: PanelSlot) {
  return (
    <Panel className={className}>
      <PanelTitle>Ce qui marche en 2026</PanelTitle>
      <ul className="flex flex-col gap-4">
        {contenu.regles2026.map((rule) => (
          <li key={rule.titre}>
            <p className="font-extrabold">{rule.titre}</p>
            <p className="mt-0.5 text-[14px] text-muted">
              {rule.detail}{" "}
              <a
                className="link inline-flex items-center gap-0.5 whitespace-nowrap"
                href={rule.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source
                <span className="sr-only"> : {new URL(rule.source).hostname} (nouvel onglet)</span>
                <ExternalIcon width={14} height={14} />
              </a>
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function ThreadPanel({ className }: PanelSlot) {
  return (
    <Panel className={className}>
      <PanelTitle>Le fil rouge coulisses</PanelTitle>
      <p className="mb-4 text-[14.5px]">{plan.filRouge.intro}</p>
      <ul className="bullets text-[14.5px]">
        {plan.filRouge.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </Panel>
  );
}
