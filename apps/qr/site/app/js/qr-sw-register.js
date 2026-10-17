// QR J01 R2 (QR-only): registers app/sw.js for the Asma pages. (J02 S3: Quran Study's pages register the same worker
// through MMSA's unchanged sw-register.js; both ask for the same script and type, so there is one registration.)
//
// Kill switches, as in MMSA: ?nosw in the address, or localStorage mm_disable_service_worker = "1". Either one
// unregisters the worker and skips registering it (the page then works straight from the network).
// A new version never swaps in by itself: onUpdateReady() is told, the page shows a quiet note, and only
// applyUpdate() (the reader's tap on Reload) lets the new worker take over and reloads once.

export const QURAN_CACHE = "qr-quran-v1";

export function serviceWorkerSwitchedOff() {
  if (new URLSearchParams(location.search).has("nosw")) return true;
  try { return localStorage.getItem("mm_disable_service_worker") === "1"; } catch { return false; }
}

let waitingWorker = null;
let reloadAsked = false;

export async function registerQrServiceWorker({ onUpdateReady } = {}) {
  if (!("serviceWorker" in navigator)) return null;
  if (serviceWorkerSwitchedOff()) {
    const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(regs.map((r) => r.unregister()));
    return null;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (reloadAsked) location.reload(); });
  try {
    // QR J02 S3: exactly what MMSA's sw-register.js (used unchanged by Quran Study and the pages it opens) asks for:
    // the same script, as a module, scope /app/. So every QR page shares ONE registration. The worker reads its
    // version from qr-version.js itself (a new number is a change the browser sees as an update).
    // J02 S3b: app/sw.js runs as a classic worker too, so a browser that cannot run module workers still gets it.
    // (On such a browser MMSA's register, which asks only for a module, fails and changes nothing.)
    const reg = await navigator.serviceWorker.register("/app/sw.js", { type: "module" })
      .catch((err) => (err?.name === "TypeError" ? navigator.serviceWorker.register("/app/sw.js") : Promise.reject(err)));
    const tell = (w) => { if (w && navigator.serviceWorker.controller) { waitingWorker = w; onUpdateReady?.(w); } };
    tell(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      // J02 S3b: a worker of the SAME version started another way takes over by itself at once (see app/sw.js); only
      // a worker still waiting a moment later is a real new version for the reader.
      w?.addEventListener("statechange", () => { if (w.state === "installed") setTimeout(() => { if (reg.waiting === w) tell(w); }, 1500); });
    });
    return reg;
  } catch (err) {
    console.warn("Offline use is not available in this browser:", err?.message ?? err);
    return null;
  }
}

/** The reader tapped Reload: the waiting version takes over, then the page reloads once. */
export function applyUpdate() {
  if (!waitingWorker) { location.reload(); return; }
  reloadAsked = true;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

/** How many of `urls` are saved for offline use. */
export async function countSaved(urls) {
  if (!("caches" in self)) return 0;
  const cache = await caches.open(QURAN_CACHE);
  let n = 0;
  for (const u of urls) if (await cache.match(u, { ignoreSearch: true })) n++;
  return n;
}

/** Saves every one of `urls` for offline use, four at a time; onProgress(done, total). Resolves to the number
 *  that could not be saved (0 = all saved). */
export async function saveForOffline(urls, onProgress) {
  const cache = await caches.open(QURAN_CACHE);
  let done = 0, failed = 0, next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const u = urls[next++];
      try {
        if (!(await cache.match(u, { ignoreSearch: true }))) {
          const res = await fetch(u, { cache: "reload" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await cache.put(u, res);
        }
      } catch { failed++; }
      onProgress?.(++done, urls.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return failed;
}
