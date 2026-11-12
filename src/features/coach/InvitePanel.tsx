import { type FormEvent, useState } from "react";
import { BackendError } from "../../data/backend";
import { useInvitation } from "../../data/queries";
import { formatMoment } from "../../domain/dates";
import { CopyBox } from "../../ui/CopyBox";
import { Panel, PanelTitle } from "../../ui/Panel";
import { useToast } from "../../ui/Toast";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** L'adresse à donner au créateur : là où le site est servi. */
function siteAddress(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

/**
 * Tant que le coach n'a pas de créateur : inviter son adresse e-mail, puis lui dire
 * comment créer son compte. L'invitation est valable 7 jours.
 */
export function InvitePanel({ coachId }: { coachId: string }) {
  const showToast = useToast();
  const { invitation, invite, cancel } = useInvitation(coachId);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    const address = email.trim();
    if (name === "") return setFailure("Écris son prénom.");
    if (!EMAIL_PATTERN.test(address)) return setFailure("Cette adresse e-mail n'est pas valide.");

    setFailure(null);
    try {
      await invite.mutateAsync({ email: address, displayName: name });
      showToast("Invitation prête");
    } catch (error) {
      const alreadyInvited = error instanceof BackendError && error.code === "already_invited";
      setFailure(
        alreadyInvited
          ? "Cette adresse a déjà une invitation en attente."
          : "L'invitation n'est pas partie. Vérifie ta connexion et réessaie.",
      );
    }
  }

  if (invitation.isPending) {
    return (
      <Panel className="mx-auto max-w-[620px]">
        <p className="text-muted" role="status">
          Chargement...
        </p>
      </Panel>
    );
  }

  const pending = invitation.data;
  if (pending) {
    return (
      <Panel className="mx-auto max-w-[620px]">
        <PanelTitle>{`Invitation prête pour ${pending.displayName}`}</PanelTitle>
        <p className="text-[14.5px]">
          <b className="font-extrabold">{pending.email}</b> peut créer son compte jusqu'au{" "}
          {formatMoment(pending.expiresAt)}. Aucun e-mail ne part tout seul : c'est à toi de le
          prévenir.
        </p>
        <ol className="steps mt-4 mb-5 text-[14.5px]">
          <li>
            <span>Envoie-lui l'adresse du site ci-dessous.</span>
          </li>
          <li>
            <span>
              Il clique « Crée ton compte », entre cette adresse e-mail et choisit son mot de passe.
            </span>
          </li>
          <li>
            <span>Son suivi s'affiche ici dès qu'il est connecté.</span>
          </li>
        </ol>
        <CopyBox label="Adresse du site" text={siteAddress()} primary />
        <p className="mt-5">
          <button
            type="button"
            className="btn"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate(pending.email)}
          >
            Annuler l'invitation
          </button>
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="mx-auto max-w-[620px]">
      <PanelTitle>Invite ton créateur</PanelTitle>
      <p className="mb-4 text-[14.5px] text-muted">
        Seule l'adresse que tu invites pourra créer un compte créateur. Tu verras ensuite tout son
        suivi ici.
      </p>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="invite-name">Son prénom</label>
          <input
            id="invite-name"
            className="input"
            autoComplete="off"
            maxLength={60}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="invite-email">Son e-mail</label>
          <input
            id="invite-email"
            className="input"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        {(failure || invitation.isError) && (
          <p role="alert" className="text-[14px] font-semibold text-bad">
            {failure ?? "Impossible de vérifier tes invitations. Vérifie ta connexion."}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn--primary" disabled={invite.isPending}>
            {invite.isPending ? "Invitation..." : "Inviter"}
          </button>
        </div>
      </form>
    </Panel>
  );
}
