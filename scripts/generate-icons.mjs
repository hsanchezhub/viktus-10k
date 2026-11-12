// Génère les icônes du site (écran d'accueil, favicon) dans public/icons.
// À relancer seulement si le dessin de l'icône change : npm run icons
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = `${root}public/icons`;
const CANVAS = 512;

// scale : part du carré occupée par le dessin. Les icônes « maskable » sont rognées
// par le système, le dessin doit tenir dans la zone centrale.
const icons = [
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, scale: 0.74 },
  { file: "apple-touch-icon.png", size: 180, scale: 0.92 },
  { file: "favicon-32.png", size: 32, scale: 1.12 },
];

const anton = await readFile(
  `${root}node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2`,
);

function page(scale) {
  return `<!doctype html>
<style>
  @font-face { font-family: Anton; src: url(data:font/woff2;base64,${anton.toString("base64")}); }
  html, body { margin: 0; }
  body {
    width: ${CANVAS}px; height: ${CANVAS}px; overflow: hidden; display: grid; place-items: center;
    background:
      radial-gradient(70% 60% at 0% 100%, rgb(255 79 139 / .5), transparent 70%),
      radial-gradient(60% 50% at 100% 0%, rgb(201 211 224 / .22), transparent 70%),
      #131217;
  }
  .mark { transform: scale(${scale}); display: grid; justify-items: center; gap: 26px; }
  .word { font: 400 248px/0.82 Anton; letter-spacing: .01em; color: #f4f2f7; }
  .word b { font-weight: 400; color: #ff4f8b; }
  .fade { width: 100%; height: 30px; border-radius: 99px;
    background: linear-gradient(90deg, rgb(255 79 139 / .08), #ff4f8b); }
</style>
<div class="mark"><div class="word">10<b>K</b></div><div class="fade"></div></div>`;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const icon of icons) {
    const context = await browser.newContext({
      viewport: { width: CANVAS, height: CANVAS },
      deviceScaleFactor: icon.size / CANVAS,
    });
    const tab = await context.newPage();
    await tab.setContent(page(icon.scale));
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: `${outDir}/${icon.file}` });
    await context.close();
    console.log(`${icon.file} (${icon.size} px)`);
  }
} finally {
  await browser.close();
}
