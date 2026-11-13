import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const TEMPLATE = fileURLToPath(new URL("./sw.js", import.meta.url));
const SHELL = "index.html";

/**
 * Ce que le service worker garde dès l'installation : de quoi ouvrir le site sans réseau.
 * Les polices ne sont gardées que pour l'alphabet latin (les autres jeux ne servent pas),
 * les écrans de démarrage iOS et le reste se passent de copie.
 */
export function isPrecached(path: string): boolean {
  if (path === SHELL || path === "manifest.webmanifest" || path === "icons/icon-192.png") {
    return true;
  }
  if (!path.startsWith("assets/")) return false;
  if (/\.(js|css)$/.test(path)) return true;
  return /-latin-(?!ext)[^/]*\.woff2$/.test(path);
}

async function listFiles(dir: string, root = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(path, root);
      return [relative(root, path).split(sep).join("/")];
    }),
  );
  return nested.flat().sort();
}

/**
 * Écrit dist/sw.js une fois le site construit : la liste des fichiers à garder, et une
 * version qui change dès qu'un de ces fichiers ou le service worker lui-même change.
 */
export function serviceWorker(): Plugin {
  let outDir = "dist";

  return {
    name: "viktus-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const precache = (await listFiles(outDir)).filter(isPrecached);
      const [template, shell] = await Promise.all([
        readFile(TEMPLATE, "utf8"),
        readFile(join(outDir, SHELL), "utf8"),
      ]);
      // Les fichiers d'assets portent une empreinte dans leur nom : la liste suffit à les décrire.
      const version = createHash("sha256")
        .update(JSON.stringify(precache))
        .update(shell)
        .update(template)
        .digest("hex")
        .slice(0, 12);

      const source = template
        .replace('"__VERSION__"', JSON.stringify(version))
        .replace("__PRECACHE__", JSON.stringify(precache));
      await writeFile(join(outDir, "sw.js"), source);
    },
  };
}
