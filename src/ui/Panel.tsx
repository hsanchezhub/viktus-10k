import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../lib/cx";

type PanelTone = "default" | "lit" | "quiet";

interface PanelProps extends ComponentPropsWithoutRef<"section"> {
  as?: "section" | "article" | "div";
  /** « lit » allume le néon (phase en cours), « quiet » met le panneau en retrait. */
  tone?: PanelTone;
}

const toneClass: Record<PanelTone, string | false> = {
  default: false,
  lit: "panel--lit",
  quiet: "panel--quiet",
};

/** Un panneau de verre fumé. La matière est définie une fois, dans styles/index.css. */
export function Panel({ as: Tag = "section", tone = "default", className, ...rest }: PanelProps) {
  return <Tag className={cx("panel p-4 lg:p-6", toneClass[tone], className)} {...rest} />;
}

/** Titre d'un panneau. Avec un id, le panneau peut le prendre pour nom (aria-labelledby). */
export function PanelTitle({ id, children }: { id?: string; children: string }) {
  return (
    <h2 id={id} className="mb-3 text-[17px] leading-snug font-extrabold lg:text-lg">
      {children}
    </h2>
  );
}
