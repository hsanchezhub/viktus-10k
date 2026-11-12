import { contenu } from "../../content";
import { diffDays, formatShort, type IsoDate, monthLabel } from "../../domain/dates";
import { targetAt } from "../../domain/target";
import { formatNumber } from "../../lib/format";

const WIDTH = 400;
const HEIGHT = 250;
const MARGIN = { left: 44, right: 14, top: 24, bottom: 34 };

const GRID_VALUES = [0, 2500, 5000, 7500, 10000];
const MONTH_TICKS: IsoDate[] = [
  "2026-12-01",
  "2027-02-01",
  "2027-04-01",
  "2027-06-01",
  "2027-08-01",
];

interface FollowersChartProps {
  /** Relevés d'abonnés saisis, par jour. */
  readings: Record<IsoDate, number>;
}

/** La courbe des abonnés réels (trait plein rose) contre la trajectoire objectif (pointillés). */
export function FollowersChart({ readings }: FollowersChartProps) {
  const { audit, trajectoireObjectif: trajectory, phases } = contenu.programme;
  const first = trajectory[0];
  const last = trajectory.at(-1);
  if (!first || !last) return null;

  const span = diffDays(first.date, last.date);
  const top = last.abonnes;
  const x = (date: IsoDate) =>
    MARGIN.left + ((WIDTH - MARGIN.left - MARGIN.right) * diffDays(first.date, date)) / span;
  const y = (value: number) =>
    HEIGHT - MARGIN.bottom - ((HEIGHT - MARGIN.top - MARGIN.bottom) * value) / top;
  const path = (points: Array<[IsoDate, number]>) =>
    points
      .map(
        ([date, value], index) =>
          `${index ? "L" : "M"}${x(date).toFixed(1)} ${y(value).toFixed(1)}`,
      )
      .join(" ");

  // Le relevé de l'audit ouvre toujours la courbe ; les relevés hors période sont ignorés.
  const real: Array<[IsoDate, number]> = Object.entries({
    [first.date]: audit.followers,
    ...readings,
  })
    .filter(([date]) => date >= first.date && date <= last.date)
    .sort(([a], [b]) => a.localeCompare(b));
  const latest = real.at(-1) ?? [first.date, audit.followers];
  const gap = latest[1] - targetAt(latest[0], trajectory);

  // Les paliers de fin de phase, repères sur la trajectoire.
  const milestones = trajectory.filter((point) =>
    phases.some((phase) => phase.goal[1] === point.abonnes),
  );

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Abonnés réels comparés à la trajectoire objectif. Dernier relevé : ${formatNumber(latest[1])} abonnés le ${formatShort(latest[0])}.`}
      >
        <g fontFamily="var(--font-mono)" fontSize="10.5" fill="var(--muted)">
          {GRID_VALUES.map((value) => (
            <g key={value}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--well-line)"
              />
              <text x={MARGIN.left - 8} y={y(value) + 4} textAnchor="end">
                {formatNumber(value)}
              </text>
            </g>
          ))}
          {MONTH_TICKS.map((date) => (
            <text key={date} x={x(date)} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle">
              {monthLabel(date)}
            </text>
          ))}
          {milestones.map((point) => (
            <g key={point.date}>
              <circle cx={x(point.date)} cy={y(point.abonnes)} r="3.5" />
              <text
                x={x(point.date)}
                y={y(point.abonnes) - 10}
                fontSize="11.5"
                textAnchor={point.abonnes === top ? "end" : "middle"}
              >
                {formatNumber(point.abonnes)}
              </text>
            </g>
          ))}
        </g>
        <path
          d={path(trajectory.map((point) => [point.date, point.abonnes]))}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <path
          d={path(real)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {real.map(([date, value]) => (
          <circle key={date} cx={x(date)} cy={y(value)} r="4" fill="var(--accent)">
            <title>{`${formatShort(date)} : ${formatNumber(value)} abonnés`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 text-[13px] text-muted">
        Trait plein : les relevés. Pointillés : la trajectoire objectif. Au {formatShort(latest[0])}{" "}
        : <b className="font-extrabold text-fg">{formatNumber(latest[1])} abonnés</b>,{" "}
        {gap > 0 && (
          <b className="font-extrabold text-good">{formatNumber(gap)} au-dessus de l'objectif</b>
        )}
        {gap === 0 && <b className="font-extrabold text-fg">pile sur l'objectif</b>}
        {gap < 0 && (
          <b className="font-extrabold text-warn">{formatNumber(-gap)} sous l'objectif</b>
        )}
        .
      </figcaption>
    </figure>
  );
}
