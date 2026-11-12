import { complement, contenu } from "../../content";
import { CopyBox } from "../../ui/CopyBox";
import { Emphasis } from "../../ui/Emphasis";
import { Panel, PanelTitle } from "../../ui/Panel";
import { ScreenHeader, SectionTitle } from "../../ui/ScreenHeader";
import { SafeZone } from "./SafeZone";

const { montage } = complement;

// Un seul message à coller : la préparation du dossier, puis les instructions de style
// que Claude Code enregistre dans le CLAUDE.md du dossier.
const installMessage = `${montage.installation.message}\n\n${contenu.montage.instructionsProjet}`;

/** Monter ses reels avec Claude Code : l'installation, le tournage, le dimanche, les prompts. */
export function MontageScreen() {
  return (
    <>
      <ScreenHeader title="Claude, ton monteur" eyebrow="Tu filmes, Claude monte" />
      <p className="mb-5 max-w-[70ch] text-[15px] lg:mb-8 lg:text-base">{montage.intro}</p>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Panel className="lg:col-span-7">
          <PanelTitle>1. Une seule fois : l'installation</PanelTitle>
          <Steps items={montage.installation.etapes} />
          <div className="mt-5">
            <CopyBox label="Message d'installation" text={installMessage} primary />
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelTitle>2. Au fauteuil : le kit 4 plans</PanelTitle>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px]">
            <ol className="steps text-[14.5px]">
              {montage.kit.plans.map((shot) => (
                <li key={shot.fort}>
                  <span>
                    <Emphasis {...shot} />
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex justify-center">
              <SafeZone />
            </div>
          </div>
          <p className="mt-4 text-[13.5px] text-muted">{montage.kit.accord}</p>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelTitle>3. Le dimanche : monter avec Claude</PanelTitle>
          <Steps items={montage.dimanche.etapes} />
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelTitle>Avant de publier : la checklist</PanelTitle>
          <ul className="bullets text-[14.5px]">
            {montage.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <section className="mt-8 lg:mt-12" aria-labelledby="titre-prompts">
        <SectionTitle id="titre-prompts">Les prompts à copier</SectionTitle>
        <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {contenu.montage.prompts.map((prompt) => (
            <li key={prompt.titre} className="flex">
              <Panel as="article" className="flex-1">
                <CopyBox label={prompt.titre} text={prompt.texte} />
              </Panel>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className="steps text-[14.5px]">
      {items.map((item) => (
        <li key={item}>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
