import { cx } from "../lib/cx";
import { Panel } from "./Panel";

type Tone = "muted" | "good" | "warn" | "bad";

const toneClass: Record<Tone, string> = {
  muted: "text-muted",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

interface StatTileProps {
  value: string;
  label: string;
  /** Précision sous le libellé. Sa couleur porte un état (dans les temps, en retard, alerte). */
  detail?: string;
  tone?: Tone;
}

/** Un chiffre clé, en grand. À placer dans une <dl>. */
export function StatTile({ value, label, detail, tone = "muted" }: StatTileProps) {
  return (
    <Panel as="div" className="flex min-w-0 flex-col-reverse justify-end gap-1 !p-3.5 lg:!p-5">
      <dt className="text-[12.5px] leading-tight font-semibold text-muted">
        {label}
        {detail && (
          <span className={cx("mt-0.5 block font-normal", toneClass[tone])}>{detail}</span>
        )}
      </dt>
      <dd className="display text-[30px] tabular-nums lg:text-[44px]">{value}</dd>
    </Panel>
  );
}
