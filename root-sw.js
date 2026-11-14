// MSA: the worker for the site's own ADDRESS (https://madrasatul-muslimeen.github.io/ and /index.html), so the front door
// opens with no internet (PCF MSA J120; the Owner, 15 Nov 2026: "Offline didn't work. all files downloaded, tick mark shown
// yet didn't work", a screenshot of Chrome's offline page on the bare address).
// MSA's real worker is /app/sw.js, scope /app/, and GitHub Pages cannot send the header that would let it reach "/"; the root
// index.html is only a jump into /app/quranrevival.html, so offline it gave the browser's own "no internet" page.
// The same shape as QR's apps/qr/site/root-sw.js, and smaller on purpose:
//   - the browser always picks the registration with the LONGEST matching scope, so every /app/ page stays with /app/sw.js;
//   - it answers ONLY "/" and "/index.html": every other address (the legacy-v… archives included) goes to the network
//     exactly as if no worker existed;
//   - network first, so online nothing changes; only when the network fails does it send the reader on to
//     /app/quranrevival.html, which /app/sw.js has saved. It keeps no cache of its own.
// Registered by app/js/sw-register.js after /app/sw.js; checked by tools/i18n-verify/offline-front-door-browser.mjs.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const FRONT = new Set(["/", "/index.html"]);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || !FRONT.has(url.pathname)) return;
  event.respondWith(fetch(request).catch(() => Response.redirect(new URL("/app/quranrevival.html", location.origin).href, 302)));
});
