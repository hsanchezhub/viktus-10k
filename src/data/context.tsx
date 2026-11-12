import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Account, Backend } from "./backend";

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

/** Suit le compte connecté, y compris quand la session change dans un autre onglet. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const backend = useBackend();
  const [account, setAccount] = useState<AccountState>(undefined);

  useEffect(() => {
    let active = true;
    backend
      .getAccount()
      .then((found) => active && setAccount(found))
      // Session illisible (réseau coupé au démarrage) : on demande de se reconnecter.
      .catch(() => active && setAccount(null));
    const stop = backend.onAccountChange((changed) => active && setAccount(changed));
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
