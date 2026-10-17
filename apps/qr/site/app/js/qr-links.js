// QR J02 S4 (QR-only): links in the pages copied from MMSA that point at pages QR does not hold (the other study
// modules, the teaching pages, the Hadith library...). Copied files stay unchanged: app/sw.js adds one line that
// loads this file to each copied page as it serves it, and the site's 404.html uses it for anything still missed.
//
// THE ONE SWITCH (the owner's QR J02 Q1):
//   "mmsa"  such a link opens the same page in the full Madrasah (https://madrasatul-muslimeen.github.io/app/<page>)
//   "hide"  such a link is hidden (and a menu group or the Continue strip left with nothing in it is hidden too)
export const QR_OTHER_SUBJECTS = "mmsa";

export const MMSA_ORIGIN = "https://madrasatul-muslimeen.github.io";

/** Every page QR holds under app/ (tools/qr-verify/links-browser.mjs checks this list against the files). */
export const QR_PAGES = Object.freeze([
  "asma-about.html", "asma.html", "index.html", "journey-map.html", "ldog-study.html", "quranrevival.html",
]);

// J02 S1e (PCA J71, one home for every app part): Notes and the other pages Quran Study opens live in MMSA. A link to
// one of them ALWAYS opens it there (whatever the switch above says: these are QR's own features, not other
// subjects), marked with a small ↗ and a title saying sign-in may be asked once; the first time, a calm note first
// (qr-away-note.js). Sign-in is per site address, so MMSA may ask the reader to sign in once.
export const MMSA_HOME_PAGES = Object.freeze([
  "about.html", "accept-invite.html", "bookmarks.html", "import-notes.html", "monitor.html", "notes.html", "onboarding.html", "records.html",
]);

/** True for an address on this site naming one of MMSA_HOME_PAGES. */
export function mmsaHome(url) {
  let u;
  try { u = new URL(url, location.href); } catch { return false; }
  const m = u.origin === location.origin && u.pathname.match(/^\/app\/([^/]+\.html)$/);
  return !!m && MMSA_HOME_PAGES.includes(m[1]);
}

/** MMSA pages whose subject QR has its own page for: such a link opens QR's page (in either mode). */
export const SAME_IN_QR = Object.freeze({ "asma-study.html": "asma.html" });

/** True for an address on this site, under /app/, naming a page QR does not hold. */
export function notInQr(url) {
  let u;
  try { u = new URL(url, location.href); } catch { return false; }
  if (u.origin !== location.origin) return false;
  const m = u.pathname.match(/^\/app\/([^/]+\.html)$/);
  return !!m && !QR_PAGES.includes(m[1]);
}

/** QR's own page for an MMSA page whose subject QR has (SAME_IN_QR), with its ?query and #place; else null. */
export function sameInQr(url) {
  const u = new URL(url, location.href);
  const own = notInQr(u.href) ? SAME_IN_QR[u.pathname.split("/").pop()] : null;
  return own ? `/app/${own}${u.search}${u.hash}` : null;
}

/** The same page, with its ?query and #place, in the full Madrasah. */
export function mmsaUrl(url) {
  const u = new URL(url, location.href);
  return `${MMSA_ORIGIN}${u.pathname}${u.search}${u.hash}`;
}

const HIDDEN = "data-qr-hidden";
// A container that only exists to hold links: hidden when every link in it is.
const HOLDERS = ".nav-cat-group, .nav-cat, .continue-strip";

function visibleControls(el) {
  return [...el.querySelectorAll("a[href], button, select, input")].filter((c) => !c.closest(`[${HIDDEN}]`) && !c.closest("summary"));
}

function fixLink(a, mode) {
  const href = a.getAttribute("href") ?? "";
  if (!notInQr(href)) return;
  const own = sameInQr(href);
  if (own) { a.setAttribute("href", own); a.dataset.qrOwn = ""; return; }
  if (mmsaHome(href)) { markAway(a, mmsaUrl(href)); return; }
  if (mode === "hide") {
    if (a.hasAttribute(HIDDEN)) return;
    a.setAttribute(HIDDEN, "");
    for (let h = a.parentElement?.closest(HOLDERS); h; h = h.parentElement?.closest(HOLDERS)) {
      if (!h.hasAttribute(HIDDEN) && visibleControls(h).length === 0) h.setAttribute(HIDDEN, "");
    }
  } else {
    a.href = mmsaUrl(href);
    a.dataset.qrMmsa = "";
    if (!a.title) a.title = "madrasatul-muslimeen.github.io";
  }
}

/** A link to a page whose home is MMSA (J02 S1e): its address there, a small ↗, and words for the title and a reader. */
function markAway(a, url) {
  a.href = url;
  a.dataset.qrMmsa = "";
  a.dataset.qrAway = "";
  const words = awayTitle();
  a.title = words;
  if (!a.querySelector(".qr-away-mark")) {
    const mark = document.createElement("span");
    mark.className = "qr-away-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = " ↗";
    a.append(mark);
    const said = document.createElement("span");
    said.className = "qr-away-said";
    said.textContent = ` (${words})`;
    a.append(said);
  }
}

export function awayTitle() {
  let bn = false;
  try { bn = localStorage.getItem("mm_app_lang") === "bn"; } catch { /* storage blocked: English */ }
  return bn ? "মাদ্রাসা অ্যাপে খোলে। আপনার নোট দেখতে সেখানে একবার সাইন ইন করুন।" : "Opens in the Madrasah app. Sign in once there to see your notes.";
}

/** Fixes every link in `root` (an element or the document). Returns how many links it changed or hid. */
export function fixLinks(root = document, mode = QR_OTHER_SUBJECTS) {
  const links = root.matches?.("a[href]") ? [root] : [...root.querySelectorAll("a[href]")];
  let n = 0;
  for (const a of links) if (notInQr(a.getAttribute("href") ?? "")) { fixLink(a, mode); n++; }
  return n;
}

export const AWAY_NOTE_KEY = "qr_mmsa_away_note_seen";
export function awayNoteSeen() {
  try { return localStorage.getItem(AWAY_NOTE_KEY) === "1"; } catch { return false; }
}

let started = false;
/** Fixes the page now and every link the page draws later (menus, the Continue strip, lists drawn after sign-in). */
export function startQrLinks(mode = QR_OTHER_SUBJECTS) {
  if (started) return;
  started = true;
  const style = document.createElement("style");
  style.textContent = `[${HIDDEN}]{display:none!important}.qr-away-mark{opacity:.75;font-size:.9em}`
    + `.qr-away-said{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;
  document.head.appendChild(style);
  fixLinks(document, mode);
  // J02 S1e: the first time a reader follows a link to a page whose home is MMSA, a calm note before leaving.
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[data-qr-away]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (awayNoteSeen()) return;
    e.preventDefault();
    import("./qr-away-note.js").then((m) => m.showAwayNote()).then((go) => {
      if (!go) return;
      if (a.target === "_blank") window.open(a.href, "_blank", "noopener"); else location.href = a.href;
    });
  }, true);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") { if (r.target.matches?.("a[href]")) fixLinks(r.target, mode); continue; }
      for (const node of r.addedNodes) if (node.nodeType === 1) fixLinks(node, mode);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
}
