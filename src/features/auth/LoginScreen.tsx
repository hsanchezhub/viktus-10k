import { MotionConfig } from "motion/react";
import { type FormEvent, useState } from "react";
import { Navigate } from "react-router";
import { Ambient } from "../../app/Ambient";
import { complement } from "../../content";
import { BackendError, type BackendErrorCode } from "../../data/backend";
import { useAccount, useBackend } from "../../data/context";
import { Panel } from "../../ui/Panel";

type Mode = "signIn" | "signUp";

const MIN_PASSWORD_LENGTH = 8;

// Les cas qui peuvent arriver à la connexion. Tout autre échec affiche le message « unknown ».
const failureMessages: Partial<Record<BackendErrorCode, string>> & { unknown: string } = {
  invalid_credentials: "E-mail ou mot de passe incorrect.",
  not_invited: "Cette adresse n'est pas invitée. Demande à ton coach de t'ajouter.",
  already_registered: "Un compte existe déjà avec cette adresse. Connecte-toi.",
  weak_password: `Mot de passe trop court : ${MIN_PASSWORD_LENGTH} caractères minimum.`,
  signup_closed: "La création de compte n'est pas encore ouverte. Préviens ton coach.",
  network: "Pas de connexion. Vérifie ton réseau et réessaie.",
  unknown: "Ça n'a pas marché. Réessaie dans un instant.",
};

const copy = {
  signIn: {
    title: "Connexion",
    submit: "Se connecter",
    pending: "Connexion...",
    switchPrompt: "Première visite ?",
    switchAction: "Crée ton compte",
  },
  signUp: {
    title: "Crée ton compte",
    submit: "Créer mon compte",
    pending: "Création...",
    switchPrompt: "Déjà un compte ?",
    switchAction: "Connecte-toi",
  },
} as const;

/** Connexion par e-mail et mot de passe. La création de compte est réservée aux adresses invitées. */
export function LoginScreen() {
  const backend = useBackend();
  const account = useAccount();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Déjà connecté (ou connexion réussie à l'instant) : direction le site.
  if (account) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailure(null);
    setPending(true);
    try {
      if (mode === "signIn") await backend.signIn(email.trim(), password);
      else await backend.signUp(email.trim(), password);
    } catch (error) {
      const code = error instanceof BackendError ? error.code : "unknown";
      setFailure(failureMessages[code] ?? failureMessages.unknown);
    } finally {
      setPending(false);
    }
  }

  function switchMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setFailure(null);
  }

  const text = copy[mode];
  const [brandLead, ...brandRest] = complement.site.nom.split(" ");

  return (
    <MotionConfig reducedMotion="user">
      <Ambient progress={0} />
      <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-4 py-10">
        <p className="display text-[44px]">
          {brandLead} <span className="text-accent">{brandRest.join(" ")}</span>
        </p>
        <p className="mt-2 mb-6 font-mono text-[12.5px] text-muted">{complement.site.objectif}</p>

        <Panel>
          <h1 className="mb-4 text-[20px] font-extrabold">{text.title}</h1>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                className="input"
                type="password"
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                minLength={mode === "signUp" ? MIN_PASSWORD_LENGTH : undefined}
                required
                aria-describedby={mode === "signUp" ? "login-password-hint" : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === "signUp" && (
                <p id="login-password-hint" className="text-[13px] text-muted">
                  {MIN_PASSWORD_LENGTH} caractères minimum. Ton téléphone peut le retenir pour toi.
                </p>
              )}
            </div>

            {failure && (
              <p role="alert" className="text-[14px] font-semibold text-bad">
                {failure}
              </p>
            )}

            <button type="submit" className="btn btn--primary min-h-[52px]" disabled={pending}>
              {pending ? text.pending : text.submit}
            </button>
          </form>
        </Panel>

        <p className="mt-5 text-center text-[14.5px] text-muted">
          {text.switchPrompt}{" "}
          <button type="button" className="link" onClick={switchMode}>
            {text.switchAction}
          </button>
        </p>
      </main>
    </MotionConfig>
  );
}
