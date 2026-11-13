import { describe, expect, it } from "vitest";
import { isPrecached } from "./plugin";

describe("isPrecached", () => {
  it("garde la page, son code, ses styles et de quoi afficher une notification", () => {
    for (const path of [
      "index.html",
      "manifest.webmanifest",
      "icons/icon-192.png",
      "assets/index-B1x2y3.js",
      "assets/index-C4z5.css",
    ]) {
      expect(isPrecached(path), path).toBe(true);
    }
  });

  it("ne garde que les polices de l'alphabet latin", () => {
    expect(isPrecached("assets/manrope-latin-wght-normal-Dk3f.woff2")).toBe(true);
    expect(isPrecached("assets/anton-latin-400-normal-Ab12.woff2")).toBe(true);
    expect(isPrecached("assets/anton-latin-ext-400-normal-Ab12.woff2")).toBe(false);
    expect(isPrecached("assets/manrope-cyrillic-wght-normal-Zz9.woff2")).toBe(false);
    expect(isPrecached("assets/anton-latin-400-normal-Ab12.woff")).toBe(false);
  });

  it("laisse de côté le service worker, la page 404 et les écrans de démarrage", () => {
    for (const path of ["sw.js", "404.html", "robots.txt", "splash/iphone-1179x2556.png"]) {
      expect(isPrecached(path), path).toBe(false);
    }
  });
});
