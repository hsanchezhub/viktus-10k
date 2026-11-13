// Génère les icônes du site (écran d'accueil, favicon) dans public/icons, et les écrans de
// démarrage iPhone dans public/splash, avec leurs balises dans index.html.
// À relancer seulement si le dessin change : npm run icons
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = `${root}public/icons`;
const splashDir = `${root}public/splash`;
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

// Écrans de démarrage : iOS n'en affiche un que si sa taille est exactement celle de l'écran.
// Largeur et hauteur en points, puis densité de l'écran. Portrait seulement.
const iphones = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [428, 926, 3], // 12 Pro Max, 13 Pro Max, 14 Plus
  [420, 912, 3], // Air
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [375, 667, 2], // SE, 8
];

// Le même écran que l'attente du site (Splash) : le passage de l'un à l'autre ne se voit pas.
const splashPage = `<!doctype html>
<style>
  @font-face { font-family: Anton; src: url(data:font/woff2;base64,${anton.toString("base64")}); }
  html, body { margin: 0; height: 100%; }
  body { display: grid; place-items: center; background: #131217; }
  p { margin: 0; font: 400 34px/1 Anton; letter-spacing: .01em; text-transform: uppercase; color: #f4f2f7; }
</style>
<p>Viktus Barber</p>`;

const splashFile = ([width, height, ratio]) => `iphone-${width}x${height}@${ratio}x.png`;

function splashLinks() {
  return iphones
    .map(
      (iphone) =>
        `    <link\n      rel="apple-touch-startup-image"\n      media="(device-width: ${iphone[0]}px) and (device-height: ${iphone[1]}px) and (-webkit-device-pixel-ratio: ${iphone[2]}) and (orientation: portrait)"\n      href="%BASE_URL%splash/${splashFile(iphone)}"\n    />`,
    )
    .join("\n");
}

await mkdir(outDir, { recursive: true });
await mkdir(splashDir, { recursive: true });
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

  for (const iphone of iphones) {
    const [width, height, ratio] = iphone;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: ratio,
    });
    const tab = await context.newPage();
    await tab.setContent(splashPage);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: `${splashDir}/${splashFile(iphone)}` });
    await context.close();
    console.log(splashFile(iphone));
  }

  // Les balises des écrans de démarrage, entre deux repères de index.html.
  const indexPath = `${root}index.html`;
  const index = await readFile(indexPath, "utf8");
  const block = /(<!-- splash:debut -->)[\s\S]*?(\n {4}<!-- splash:fin -->)/;
  if (!block.test(index)) throw new Error("Repères splash absents de index.html");
  await writeFile(indexPath, index.replace(block, `$1\n${splashLinks()}$2`));
} finally {
  await browser.close();
}
