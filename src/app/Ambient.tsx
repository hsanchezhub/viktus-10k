import type { CSSProperties } from "react";

/**
 * Le fond « vitrine de nuit ». Le halo rose monte avec la progression vers l'objectif
 * de la phase : presque éteint à 0, vitrine allumée à 1.
 */
export function Ambient({ progress }: { progress: number }) {
  const style = { "--halo": progress.toFixed(3) } as CSSProperties;
  return (
    <div className="ambient" style={style} aria-hidden="true">
      <div className="ambient__halo" />
      <div className="ambient__grain" />
    </div>
  );
}
