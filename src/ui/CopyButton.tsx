import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard";
import { cx } from "../lib/cx";
import { CheckIcon, CopyIcon } from "./icons";
import { useToast } from "./Toast";

const CONFIRMATION_MS = 1600;

interface CopyButtonProps {
  /** Le texte placé dans le presse-papiers. */
  text: string;
  label?: string;
  primary?: boolean;
  /** Sans icône et plus étroit, pour tenir à deux sur une ligne dans une carte. */
  compact?: boolean;
}

export function CopyButton({
  text,
  label = "Copier",
  primary = false,
  compact = false,
}: CopyButtonProps) {
  const showToast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleClick() {
    const succeeded = await copyText(text);
    if (!succeeded) {
      showToast("Copie impossible ici : sélectionne le texte à la main.");
      return;
    }
    showToast("Copié");
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), CONFIRMATION_MS);
  }

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <button
      type="button"
      className={cx(
        "btn",
        primary && "btn--primary",
        compact && "btn--compact",
        copied && !primary && "btn--done",
      )}
      onClick={handleClick}
    >
      {!compact && <Icon width={16} height={16} />}
      {label}
    </button>
  );
}
