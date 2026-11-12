// Repères de l'interface d'Instagram sur un reel vertical : 14 % en haut, 35 % en bas.
const TOP_SHARE = 0.14;
const BOTTOM_SHARE = 0.35;

const WIDTH = 180;
const HEIGHT = 320;
const top = Math.round(HEIGHT * TOP_SHARE);
const bottom = Math.round(HEIGHT * (1 - BOTTOM_SHARE));

/** Schéma de la zone sûre : où poser le hook pour qu'Instagram ne le cache pas. */
export function SafeZone() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-[180px]"
      role="img"
      aria-label="Zone sûre d'un reel vertical : rien d'important dans les 14 % du haut ni les 35 % du bas"
    >
      <rect
        x="1"
        y="1"
        width={WIDTH - 2}
        height={HEIGHT - 2}
        rx="16"
        fill="var(--well-fill)"
        stroke="var(--well-line)"
      />
      <rect
        x="1"
        y="1"
        width={WIDTH - 2}
        height={top - 1}
        rx="16"
        fill="var(--control-fill-hover)"
      />
      <rect
        x="1"
        y={bottom}
        width={WIDTH - 2}
        height={HEIGHT - bottom - 1}
        rx="16"
        fill="var(--control-fill-hover)"
      />
      <rect
        x="11"
        y={top}
        width={WIDTH - 22}
        height={bottom - top}
        rx="6"
        fill="none"
        stroke="var(--accent)"
        strokeDasharray="4 4"
      />
      <g textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fill="var(--muted)">
        <text x={WIDTH / 2} y={top / 2 + 4}>
          14 % haut
        </text>
        <text x={WIDTH / 2} y={top + 86}>
          zone sûre
        </text>
        <text x={WIDTH / 2} y={(bottom + HEIGHT) / 2 + 4}>
          35 % bas
        </text>
      </g>
      <text
        x={WIDTH / 2}
        y={top + 36}
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize="12"
        fontWeight="800"
        fill="var(--fg)"
      >
        HOOK ICI
      </text>
    </svg>
  );
}
