import { type ReactNode, useId, useState } from "react";
import { cx } from "../lib/cx";

interface TaskRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Lecture seule : le coach voit les cases du créateur sans pouvoir les cocher. */
  disabled?: boolean;
  /** Petit mot devant le titre : « Publier », « Essai »... */
  tag?: string;
  hint?: string;
  /** Lien d'aide sous la tâche. Hors du label, pour ne pas cocher la case en le touchant. */
  action?: ReactNode;
}

/** Une ligne à cocher : to-do du jour ou première fois. */
export function TaskRow({ label, checked, onChange, disabled, tag, hint, action }: TaskRowProps) {
  const id = useId();

  // La case répond au doigt tout de suite, sans attendre que la donnée fasse l'aller-retour :
  // elle garde son propre état, et se recale sur `checked` dès que celui-ci change
  // (enregistrement confirmé, ou annulé si l'envoi a échoué).
  const [shown, setShown] = useState(checked);
  const [confirmed, setConfirmed] = useState(checked);
  if (confirmed !== checked) {
    setConfirmed(checked);
    setShown(checked);
  }

  return (
    <li className={cx("task", shown && "task--done")}>
      <label className="task__box">
        <input
          id={id}
          type="checkbox"
          className="check"
          checked={shown}
          disabled={disabled}
          onChange={(event) => {
            setShown(event.target.checked);
            onChange(event.target.checked);
          }}
        />
      </label>
      <div className="min-w-0 pb-1">
        <label htmlFor={id} className="task__label">
          {tag && <span className="task__tag">{tag}</span>}
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[13.5px] text-muted">{hint}</p>}
        {action && <p className="mt-1.5 text-[13.5px]">{action}</p>}
      </div>
    </li>
  );
}
