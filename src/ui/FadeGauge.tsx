import { motion } from "motion/react";
import { cx } from "../lib/cx";

interface FadeGaugeProps {
  /** Part remplie, entre 0 et 1. */
  value: number;
  /** Ce que mesure la jauge, pour les lecteurs d'écran. */
  label: string;
  thin?: boolean;
}

/**
 * Le « fondu » : la jauge signature, un dégradé du transparent vers l'accent.
 * Le remplissage s'anime en scaleX, jamais en largeur, pour rester sur le compositeur.
 */
export function FadeGauge({ value, label, thin = false }: FadeGaugeProps) {
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <div
      className={cx("fade-gauge", thin && "fade-gauge--thin")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <motion.div
        className="fade-gauge__fill"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: ratio }}
        transition={{ type: "spring", stiffness: 110, damping: 22 }}
      />
    </div>
  );
}
