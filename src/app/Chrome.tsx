import { motion } from "motion/react";
import { NavLink } from "react-router";
import { complement } from "../content";
import type { Phase } from "../content/schema";
import type { Role } from "../data/backend";
import { formatShort, yearOf } from "../domain/dates";
import { SettingsIcon } from "../ui/icons";
import { HOME_PATH, sectionsFor } from "./sections";

const pillSpring = { type: "spring", stiffness: 420, damping: 34 } as const;

interface ChromeProps {
  role: Role;
  phase: Phase;
  onOpenSettings: () => void;
}

// « Viktus Barber » : le premier mot en clair, la suite en rose.
const [brandLead, ...brandRest] = complement.site.nom.split(" ");

function Brand({ sub }: { sub: string }) {
  return (
    <div className="min-w-0">
      <p className="display text-[26px] whitespace-nowrap">
        {brandLead} <span className="text-accent">{brandRest.join(" ")}</span>
      </p>
      <p className="mt-1 truncate font-mono text-[11.5px] text-muted">{sub}</p>
    </div>
  );
}

/** Barre du haut, sur téléphone. */
export function TopBar({ phase, onOpenSettings }: ChromeProps) {
  return (
    <header className="chrome chrome--bar topbar lg:hidden">
      <div className="mx-auto flex max-w-[620px] items-center justify-between gap-3 py-2.5">
        <Brand sub={`${complement.site.objectif} · Phase ${phase.n}`} />
        <button
          type="button"
          className="btn btn--icon flex-none"
          onClick={onOpenSettings}
          aria-label="Réglages"
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}

/** Barre d'onglets flottante, sur téléphone. Une pastille de verre glisse sous l'onglet actif. */
export function TabBar({ role }: { role: Role }) {
  return (
    <nav className="tabbar lg:hidden" aria-label="Sections">
      <ul className="chrome flex w-full max-w-[480px] gap-0.5 rounded-[26px] p-1.5">
        {sectionsFor(role).map(({ path, label, Icon }) => (
          <li key={path} className="min-w-0 flex-1">
            <NavLink to={path} end={path === HOME_PATH} className="tab">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tab-pill"
                      className="tab__pill"
                      transition={pillSpring}
                    />
                  )}
                  <Icon />
                  <span className="max-w-full truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Rail latéral, sur ordinateur. */
export function SideRail({ role, phase, onOpenSettings }: ChromeProps) {
  return (
    <aside className="chrome fixed top-4 bottom-4 left-4 z-20 hidden w-[232px] flex-col rounded-[28px] p-4 lg:flex">
      <div className="px-2 pt-2">
        <Brand sub={complement.site.objectif} />
      </div>

      <nav className="mt-8" aria-label="Sections">
        <ul className="flex flex-col gap-1">
          {sectionsFor(role).map(({ path, label, Icon }) => (
            <li key={path}>
              <NavLink to={path} end={path === HOME_PATH} className="tab tab--row">
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="rail-pill"
                        className="tab__pill"
                        transition={pillSpring}
                      />
                    )}
                    <Icon />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="well p-3">
          <p className="eyebrow">Phase {phase.n} en cours</p>
          <p className="mt-1 font-extrabold">{phase.name}</p>
          <p className="mt-0.5 font-mono text-[11.5px] text-muted">
            {formatShort(phase.from)} au {formatShort(phase.to)} {yearOf(phase.to)}
          </p>
        </div>
        <button type="button" className="btn" onClick={onOpenSettings}>
          <SettingsIcon width={16} height={16} />
          Réglages
        </button>
      </div>
    </aside>
  );
}
