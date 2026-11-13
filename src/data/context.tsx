import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type Account, type Backend, isNetworkError } from "./backend";

const BackendContext = createContext<Backend | null>(null);

export function BackendProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  return <BackendContext value={backend}>{children}</BackendContext>;
}

export function useBackend(): Backend {
  const backend = useContext(BackendContext);
  if (!backend) throw new Error("useBackend doit être utilisé sous BackendProvider");
  return backend;
}

/** undefined : on ne sait pas encore. null : personne n'est connecté. */
type AccountState = Account | null | undefined;

const AccountContext = createContext<AccountState>(undefined);

const REMEMBERED_ACCOUNT_KEY = "viktus:account";

/** Le dernier compte connecté sur cet appareil : il permet d'ouvrir le site sans réseau. */
function rememberedAccount(): Account | null {
  try {
    const raw = localStorage.getItem(REMEMBERED_ACCOUNT_KEY);
    const found = raw ? (JSON.parse(raw) as Partial<Account>) : null;
    if (typeof found?.userId === "string" && typeof found.email === "string") {
      return { userId: found.userId, email: found.email };
    }
  } catch {
    // Stockage indisponible ou illisible : personne n'est retenu.
  }
  return null;
}

function rememberAccount(account: Account | null): void {
  try {
    if (account) localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(account));
    else localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
  } catch {
    // Stockage indisponible : le site marche quand même, mais pas sans réseau.
  }
}

/** Suit le compte connecté, y compris quand la session change dans un autre onglet. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const backend = useBackend();
  const [account, setAccount] = useState<AccountState>(undefined);

  useEffect(() => {
    let active = true;
    const settle = (found: Account | null) => {
      if (!active) return;
      rememberAccount(found);
      setAccount(found);
    };
    backend
      .getAccount()
      .then(settle)
      .catch((error: unknown) => {
        // Sans réseau, la session ne peut pas être vérifiée : on garde le compte retenu,
        // le site reste consultable. Toute autre erreur demande de se reconnecter.
        if (active) setAccount(isNetworkError(error) ? rememberedAccount() : null);
      });
    const stop = backend.onAccountChange(settle);
    return () => {
      active = false;
      stop();
    };
  }, [backend]);

  return <AccountContext value={account}>{children}</AccountContext>;
}

export function useAccount(): AccountState {
  return useContext(AccountContext);
}
