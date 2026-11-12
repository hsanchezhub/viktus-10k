// Construit le site puis prend les captures d'une étape : iPhone et ordinateur.
// Usage : npm run captures -- etape-2
//
// Les captures tournent sur le backend en mémoire, avec des DONNÉES D'EXEMPLE inventées
// pour la démonstration (ci-dessous). Elles ne viennent pas du compte de Victor.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";
import { build, preview } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const step = process.argv[2] ?? "captures";
const outDir = `${root}captures/${step}`;
const SETTLE_MS = 1600; // le temps que les chiffres et les jauges finissent leur animation

// Le jour simulé : jeudi de la semaine 2 du programme.
const TODAY = "2026-11-26";
const EVERY_TASK = [
  "kit",
  "post_tue",
  "trial_wed",
  "post_thu",
  "mep",
  "facecam",
  "post_sat",
  "stories",
  "reply",
  "source",
  "edit",
  "log",
  "followers",
  "story_mon",
  "sell",
];
const pastDays = [
  "2026-11-16",
  "2026-11-17",
  "2026-11-18",
  "2026-11-19",
  "2026-11-20",
  "2026-11-21",
  "2026-11-22",
  "2026-11-23",
  "2026-11-24",
  "2026-11-25",
];

const demoState = {
  invitations: [],
  users: [
    {
      id: "demo-creator",
      email: "victor@demo.test",
      password: "-",
      role: "creator",
      displayName: "Victor",
    },
    {
      id: "demo-coach",
      email: "hugo@demo.test",
      password: "-",
      role: "coach",
      displayName: "Hugo",
    },
  ],
  sessionUserId: "demo-creator",
  tracking: {
    days: {
      ...Object.fromEntries(pastDays.map((day) => [day, EVERY_TASK])),
      [TODAY]: ["kit", "post_thu", "stories", "reply"],
    },
    firsts: {
      f_bio: "2026-11-13",
      f_highlights: "2026-11-14",
      f_album: "2026-11-14",
      f_dayzero: "2026-11-15",
      f_setup: "2026-11-16",
      f_claude: "2026-11-16",
    },
    followers: { "2026-11-16": 652, "2026-11-23": 688 },
    hooks: [
      {
        id: "h1",
        day: "2026-11-17",
        kind: "reel",
        hook: "Il est rentré comme ça...",
        views: 3100,
        shares: 12,
        follows: 9,
      },
      {
        id: "h2",
        day: "2026-11-19",
        kind: "reel",
        hook: "Sois honnête : sur 10 ?",
        views: 2400,
        shares: 31,
        follows: 6,
      },
      {
        id: "h3",
        day: "2026-11-25",
        kind: "essai",
        hook: "Il m'a dit : fais ce que tu veux",
        views: 7400,
        shares: 58,
        follows: 31,
      },
    ],
  },
};

// scroll : part de la page défilée avant la capture (0 = haut de page).
const shots = [
  { name: "connexion", path: "connexion", scroll: 0, signedOut: true },
  { name: "aujourdhui", path: "", scroll: 0 },
  { name: "aujourdhui-suite", path: "", scroll: 0.75 },
  { name: "suivi", path: "suivi", scroll: 0 },
  { name: "suivi-carnet", path: "suivi", scroll: 0.62 },
  { name: "plan", path: "plan", scroll: 0 },
  { name: "idees", path: "idees", scroll: 0 },
];

// Les captures se font avec le Chromium complet (channel "chromium"), y compris au format
// iPhone : ni le WebKit de Playwright ni son Chromium allégé ne dessinent backdrop-filter dans
// une capture, le verre des barres y paraîtrait sans flou. Vérifié avec un test isolé.
// Les parcours (npm run e2e), eux, tournent bien sur WebKit.
const { viewport, userAgent, isMobile, hasTouch } = devices["iPhone 15"];
const profiles = [
  {
    name: "iphone",
    context: { viewport, userAgent, isMobile, hasTouch, deviceScaleFactor: 2 },
    themes: ["dark", "light"],
  },
  {
    name: "ordinateur",
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    themes: ["dark"],
  },
];

await mkdir(outDir, { recursive: true });
// Le site est reconstruit ici, sur le backend en mémoire, pour que le dossier dist
// corresponde au serveur de prévisualisation (un build GitHub Pages attend /viktus-10k/).
process.env.VITE_BACKEND = "memory";
await build({ root, logLevel: "warn" });
const server = await preview({ root, preview: { port: 4174, strictPort: true } });
const baseURL = server.resolvedUrls.local[0];

try {
  const browser = await chromium.launch({ channel: "chromium" });
  for (const profile of profiles) {
    for (const theme of profile.themes) {
      for (const shot of shots) {
        const context = await browser.newContext(profile.context);
        await context.addInitScript(
          ([chosenTheme, state]) => {
            localStorage.setItem("viktus:theme", chosenTheme);
            if (state) localStorage.setItem("viktus:demo", state);
          },
          [theme, shot.signedOut ? null : JSON.stringify(demoState)],
        );
        const page = await context.newPage();
        await page.clock.setFixedTime(new Date(`${TODAY}T09:00:00+01:00`));
        await page.goto(baseURL + shot.path);
        await page.evaluate(() => document.fonts.ready);
        // Le contenu doit être affiché avant de défiler : pendant le chargement, la page est courte.
        await page.getByRole("heading", { level: 1 }).waitFor();
        await page.evaluate((share) => {
          const scrollable = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, scrollable * share);
        }, shot.scroll);
        await page.waitForTimeout(SETTLE_MS);
        const suffix = theme === "light" ? "-clair" : "";
        await page.screenshot({ path: `${outDir}/${profile.name}-${shot.name}${suffix}.png` });
        await context.close();
      }
    }
    console.log(`${profile.name} : ${shots.length * profile.themes.length} captures`);
  }
  await browser.close();
} finally {
  await server.close();
}
