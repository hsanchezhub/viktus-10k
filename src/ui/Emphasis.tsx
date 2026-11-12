import type { Emphasized } from "../content/schema";

/** « Montrer : photo du résultat », avec le début en gras. */
export function Emphasis({ fort, texte }: Emphasized) {
  return (
    <>
      <b className="font-extrabold">{fort}</b> : {texte}
    </>
  );
}
