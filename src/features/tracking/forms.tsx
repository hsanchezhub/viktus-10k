import { type FormEvent, useState } from "react";
import type { HookKind, NewHook } from "../../data/backend";
import { type IsoDate, isIsoDate } from "../../domain/dates";
import { useToast } from "../../ui/Toast";

const HOOK_MAX_LENGTH = 200;

const hookKinds: ReadonlyArray<{ value: HookKind; label: string }> = [
  { value: "reel", label: "Reel" },
  { value: "essai", label: "Réel d'essai" },
  { value: "carrousel", label: "Carrousel" },
];

/** Lit un nombre entier positif saisi dans un champ. undefined si la saisie n'en est pas un. */
function parseCount(raw: string): number | undefined {
  const text = raw.trim();
  if (!/^\d{1,9}$/.test(text)) return undefined;
  return Number(text);
}

/** Champ facultatif : vide vaut null, une saisie invalide vaut undefined. */
function parseOptionalCount(raw: string): number | null | undefined {
  return raw.trim() === "" ? null : parseCount(raw);
}

interface FollowersFormProps {
  today: IsoDate;
  /** Dernier nombre connu, montré en exemple dans le champ. */
  lastValue: number;
  onSave: (day: IsoDate, followers: number) => Promise<unknown>;
}

/** Relevé hebdomadaire des abonnés. */
export function FollowersForm({ today, lastValue, onSave }: FollowersFormProps) {
  const showToast = useToast();
  const [day, setDay] = useState(today);
  const [count, setCount] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const followers = parseCount(count);
    if (!isIsoDate(day) || day > today)
      return setFailure("Choisis une date d'aujourd'hui ou d'avant.");
    if (followers === undefined) return setFailure("Écris ton nombre d'abonnés en chiffres.");

    setFailure(null);
    setPending(true);
    try {
      await onSave(day, followers);
      setCount("");
      showToast("Abonnés enregistrés");
    } catch {
      // Le message d'échec est déjà affiché par la couche de données.
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="followers-day">Date</label>
          <input
            id="followers-day"
            className="input"
            type="date"
            max={today}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="followers-count">Abonnés</label>
          <input
            id="followers-count"
            className="input"
            inputMode="numeric"
            placeholder={String(lastValue)}
            value={count}
            aria-invalid={failure !== null}
            aria-describedby={failure ? "followers-failure" : undefined}
            onChange={(event) => setCount(event.target.value)}
          />
        </div>
      </div>
      {failure && (
        <p id="followers-failure" role="alert" className="text-[14px] font-semibold text-bad">
          {failure}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

interface HookFormProps {
  today: IsoDate;
  onAdd: (hook: NewHook) => Promise<unknown>;
}

/** Ajout d'un reel au carnet des hooks, 72 h après sa publication. */
export function HookForm({ today, onAdd }: HookFormProps) {
  const showToast = useToast();
  const [day, setDay] = useState(today);
  const [kind, setKind] = useState<HookKind>("reel");
  const [hook, setHook] = useState("");
  const [views, setViews] = useState("");
  const [shares, setShares] = useState("");
  const [follows, setFollows] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = hook.trim();
    const counts = [views, shares, follows].map(parseOptionalCount);
    const [viewCount, shareCount, followCount] = counts;

    if (!isIsoDate(day) || day > today)
      return setFailure("Choisis une date d'aujourd'hui ou d'avant.");
    if (text === "") return setFailure("Écris le hook du reel.");
    if (viewCount === undefined || shareCount === undefined || followCount === undefined) {
      return setFailure("Les vues, partages et abonnés gagnés s'écrivent en chiffres.");
    }

    setFailure(null);
    setPending(true);
    try {
      await onAdd({
        day,
        kind,
        hook: text,
        views: viewCount,
        shares: shareCount,
        follows: followCount,
      });
      setHook("");
      setViews("");
      setShares("");
      setFollows("");
      showToast("Ajouté au carnet");
    } catch {
      // Le message d'échec est déjà affiché par la couche de données.
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="hook-day">Date</label>
          <input
            id="hook-day"
            className="input"
            type="date"
            max={today}
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="hook-kind">Type</label>
          <select
            id="hook-kind"
            className="input"
            value={kind}
            onChange={(event) => setKind(event.target.value as HookKind)}
          >
            {hookKinds.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="hook-text">Hook</label>
        <input
          id="hook-text"
          className="input"
          maxLength={HOOK_MAX_LENGTH}
          placeholder="Il m'a dit : fais ce que tu veux"
          value={hook}
          onChange={(event) => setHook(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="field">
          <label htmlFor="hook-views">Vues à 72 h</label>
          <input
            id="hook-views"
            className="input"
            inputMode="numeric"
            value={views}
            onChange={(event) => setViews(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="hook-shares">Partages</label>
          <input
            id="hook-shares"
            className="input"
            inputMode="numeric"
            value={shares}
            onChange={(event) => setShares(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="hook-follows">Abonnés gagnés</label>
          <input
            id="hook-follows"
            className="input"
            inputMode="numeric"
            value={follows}
            onChange={(event) => setFollows(event.target.value)}
          />
        </div>
      </div>
      {failure && (
        <p role="alert" className="text-[14px] font-semibold text-bad">
          {failure}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Ajout..." : "Ajouter au carnet"}
        </button>
      </div>
    </form>
  );
}
