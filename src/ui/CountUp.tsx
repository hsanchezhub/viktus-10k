import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import { formatNumber } from "../lib/format";

/** Un chiffre qui défile de 0 à sa valeur à l'apparition. Fixe si le mouvement est réduit. */
export function CountUp({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? value : 0);
  const text = useTransform(count, (latest) => formatNumber(Math.round(latest)));

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [count, value, reduceMotion]);

  return <motion.span className="tabular-nums">{text}</motion.span>;
}
