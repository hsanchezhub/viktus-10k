import complementJson from "../../content/complement.json";
import contenuJson from "../../content/contenu.json";
import type { Complement, Contenu } from "./schema";

// Les fichiers de content/ sont la source de vérité du contenu. Leur structure est vérifiée
// par content.test.ts avant chaque mise en ligne : une faute casse les tests, pas l'écran
// de Victor. Le site les lit donc tels quels, sans refaire la validation dans le navigateur.
// Le passage par unknown est voulu : TypeScript lit un JSON plus largement que le schéma
// (un tableau de nombres là où le schéma garantit une paire).
export const contenu = contenuJson as unknown as Contenu;
export const complement = complementJson as unknown as Complement;
