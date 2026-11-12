import { CopyButton } from "./CopyButton";

interface CopyBoxProps {
  label: string;
  text: string;
  primary?: boolean;
}

/** Un texte prêt à copier : son intitulé, le bouton, puis le texte tel qu'il sera collé. */
export function CopyBox({ label, text, primary }: CopyBoxProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <CopyButton text={text} primary={primary} />
      </div>
      <p
        className="well max-h-[300px] overflow-auto p-3 font-mono text-[12.5px] leading-relaxed break-words whitespace-pre-wrap"
        tabIndex={0}
        role="group"
        aria-label={label}
      >
        {text}
      </p>
    </div>
  );
}
