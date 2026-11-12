import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const VISIBLE_MS = 2600;

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Affiche un court message de confirmation en bas de l'écran, un seul à la fois. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((message) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = window.setTimeout(() => setToast(null), VISIBLE_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast.id}
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, transition: { duration: 0.14, ease: "easeIn" } }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {toast.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
