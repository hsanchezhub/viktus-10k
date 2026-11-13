// Service worker de Viktus Barber. Deux rôles : ouvrir le site sans réseau, et afficher
// les notifications. VERSION et PRECACHE sont remplis à la construction du site
// (service-worker/plugin.ts) ; ce fichier n'est jamais servi tel quel.

const VERSION = "__VERSION__";
/** Fichiers gardés dès l'installation : la page, son code, ses styles, ses polices. */
const PRECACHE = __PRECACHE__;

const CACHE_PREFIX = "viktus-";
const CACHE = `${CACHE_PREFIX}${VERSION}`;
const SCOPE = self.registration.scope;
const SHELL = new URL("index.html", SCOPE).href;
const FALLBACK_TITLE = "Viktus Barber";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload" : on prend les fichiers du serveur, pas une vieille copie du navigateur.
      .then((cache) => cache.addAll(PRECACHE.map((path) => new Request(path, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Garde une copie des fichiers au nom unique (dossier assets), qui ne changent jamais. */
async function fetchAndKeep(request) {
  const response = await fetch(request);
  if (response.ok && new URL(request.url).pathname.includes("/assets/")) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Seuls les fichiers du site passent par ici. Les appels à Supabase vont droit au réseau.
  if (request.method !== "GET" || !request.url.startsWith(SCOPE)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Toutes les pages du site sont la même coquille : elle s'ouvre du cache, même sans réseau.
      // ignoreVary : la copie vaut quels que soient les en-têtes de la demande (un script
      // de module s'annonce avec son origine, pas la mise en cache faite à l'installation).
      const wanted = request.mode === "navigate" ? SHELL : request;
      const cached = await cache.match(wanted, { ignoreVary: true });
      return cached ?? fetchAndKeep(request);
    }),
  );
});

/** Lit le contenu d'une notification. Un contenu illisible donne un message neutre. */
function readPush(event) {
  try {
    const { title, body, tag, url } = event.data.json();
    return {
      title: typeof title === "string" ? title : FALLBACK_TITLE,
      body: typeof body === "string" ? body : "",
      tag: typeof tag === "string" ? tag : undefined,
      url: typeof url === "string" ? url : "./",
    };
  } catch {
    return { title: FALLBACK_TITLE, body: "Du nouveau t'attend.", tag: undefined, url: "./" };
  }
}

/** Les fenêtres du site déjà ouvertes. */
function openWindows() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true });
}

async function tellWindows(kind) {
  for (const client of await openWindows()) client.postMessage({ source: "viktus", kind });
}

self.addEventListener("push", (event) => {
  const push = readPush(event);
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(push.title, {
        body: push.body,
        tag: push.tag,
        icon: new URL("icons/icon-192.png", SCOPE).href,
        data: { url: push.url },
      }),
      // Si le site est ouvert, il relit ses messages sans attendre.
      tellWindows("push"),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const wanted = new URL(event.notification.data?.url ?? "./", SCOPE).href;
  // Une notification n'ouvre que le site, jamais une autre adresse.
  const target = wanted.startsWith(SCOPE) ? wanted : SCOPE;

  event.waitUntil(
    openWindows().then(async (windows) => {
      const open = windows.find((client) => client.url.startsWith(SCOPE));
      if (!open) return self.clients.openWindow(target);
      await open.focus();
      open.postMessage({ source: "viktus", kind: "open" });
    }),
  );
});
