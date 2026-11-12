import { type ReactNode, useEffect, useId, useRef } from "react";
import { CloseIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Une feuille qui monte du bas sur téléphone et s'affiche au centre sur ordinateur. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // <dialog> gère lui-même le piège de focus, la touche Échap et le retour du focus.
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // Un clic sur le fond (le dialog lui-même, hors du contenu) ferme la feuille.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="chrome sheet__body">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="display text-[26px]">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--icon flex-none"
            onClick={onClose}
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
