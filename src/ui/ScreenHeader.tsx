interface ScreenHeaderProps {
  title: string;
  eyebrow: string;
}

/** Le titre d'un écran, en grandes capitales, avec sa ligne de contexte. */
export function ScreenHeader({ title, eyebrow }: ScreenHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-2 lg:mb-9 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <h1 className="display text-[42px] lg:text-[76px]">{title}</h1>
      <p className="eyebrow lg:pb-2">{eyebrow}</p>
    </header>
  );
}

/** Titre d'une section. L'id permet à la section de porter ce titre comme nom (aria-labelledby). */
export function SectionTitle({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="display mb-3 text-[24px] lg:mb-4 lg:text-[30px]">
      {children}
    </h2>
  );
}
