// Assemble la fonction Supabase « push » en un seul fichier, prêt à être déployé :
// elle réutilise les règles de la to-do du site (src/domain) et son contenu (content/).
// Usage : npm run build:function, puis déployer supabase/.bundle/push/index.js.
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));

await build({
  root,
  configFile: false,
  logLevel: "warn",
  publicDir: false,
  build: {
    lib: {
      entry: `${root}supabase/functions/push/index.ts`,
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: `${root}supabase/.bundle/push`,
    emptyOutDir: true,
    target: "esnext",
    // Lisible tel quel dans le tableau de bord Supabase.
    minify: false,
  },
});
console.log("supabase/.bundle/push/index.js");
