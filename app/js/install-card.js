// PCA J117 (the Owner, 16 Nov 2026: "Do it for Asma too" … "Enable Hadith, Health, Dua also separately installable"):
// the ONE shared Install button. A page that is its own app (its own web app manifest: Asma, Hadith, Dua, Health)
// imports this file and gets a small calm card at the bottom of the screen:
//   - Android / Chrome / Edge: the browser's own install offer is kept for OUR button. preventDefault() is called ONLY
//     in the same moment the visible card is shown (Siyagah's finding, PCA J117 p117c: cancelling the offer without a
//     visible button hides Chrome's own install bar and leaves the reader no way in). After "Not now" the offer is left
//     alone, so Chrome may still show its own bar.
//   - iPhone / iPad: there is no install offer to keep, so the card's "How?" shows "Share ⬆ then Add to Home Screen".
//   - Already running as the installed app (display-mode standalone): nothing is shown.
//   - "Not now" hides the card for 30 days, per app (the manifest's id), in this browser only.
// It reads the page's own language (<html lang>, which both MMSA's i18n.js and Asma's asma-app.js set) and follows it
// when the reader switches. It imports nothing, so it can never join any page's startup path (I9) or reach Firebase.
// Measured by tools/i18n-verify/install-card-browser.mjs.

const LATER_DAYS = 30;
const LATER_PREFIX = "mm_install_later:";

const TEXT = {
  en: {
    title: (n) => `Install ${n}`,
    body: (n) => `Put ${n} on your home screen. It opens like an app and works offline.`,
    install: "Install",
    later: "Not now",
    how: "How?",
    ios: "On iPhone or iPad: tap Share ⬆ in Safari, then “Add to Home Screen”.",
  },
  bn: {
    title: (n) => `${n} ইনস্টল করুন`,
    body: (n) => `${n} হোম স্ক্রিনে রাখুন। এটি অ্যাপের মতো খোলে এবং অফলাইনেও চলে।`,
    install: "ইনস্টল",
    later: "এখন নয়",
    how: "কীভাবে?",
    ios: "আইফোন বা আইপ্যাডে: Safari-তে শেয়ার ⬆ চাপুন, তারপর “Add to Home Screen”।",
  },
};

const CSS = `
.mm-install{position:fixed;left:50%;transform:translateX(-50%);bottom:max(12px,env(safe-area-inset-bottom));z-index:45;
  box-sizing:border-box;width:min(440px,calc(100vw - 24px));padding:12px 14px;border-radius:14px;border:1px solid #c9a24b;
  background:#13203a;color:#f2e6c4;box-shadow:0 8px 28px rgba(0,0,0,.45);font:15px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;}
.mm-install[hidden]{display:none}
.mm-install-row{display:flex;align-items:center;gap:10px}
.mm-install-icon{flex:0 0 40px;width:40px;height:40px;border-radius:9px}
.mm-install-words{flex:1 1 auto;min-width:0}
.mm-install-title{margin:0;font-weight:700;color:#e2bd62}
.mm-install-body{margin:2px 0 0;font-size:13.5px;color:#e6dcc0}
.mm-install-btns{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;flex-wrap:wrap}
.mm-install-btns button{min-height:40px;min-width:40px;padding:0 16px;border-radius:999px;font:inherit;font-weight:600;cursor:pointer}
.mm-install-go{background:#e2bd62;color:#13203a;border:1px solid #e2bd62}
.mm-install-no{background:transparent;color:#f2e6c4;border:1px solid #6f6650}
.mm-install-ios{margin:10px 0 0;padding:8px 10px;border-radius:9px;background:#0c1529;font-size:14px}
.mm-install-ios[hidden]{display:none}
`;

const isStandalone = () => {
  try { if (window.matchMedia("(display-mode: standalone)").matches) return true; } catch { /* old browser */ }
  return window.navigator.standalone === true;
};
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function laterUntil(key) {
  try { return Number(localStorage.getItem(LATER_PREFIX + key) || 0); } catch { return 0; }
}
function setLater(key) {
  try { localStorage.setItem(LATER_PREFIX + key, String(Date.now() + LATER_DAYS * 864e5)); } catch { /* private window: this visit only */ }
}

const langNow = () => ((document.documentElement.lang || "en").toLowerCase().startsWith("bn") ? "bn" : "en");

async function readManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  try {
    const r = await fetch(link.href, { cache: "force-cache" });
    if (!r.ok) return null;
    const m = await r.json();
    const base = new URL(link.href, location.href);
    const icon = (m.icons || []).find((i) => (i.purpose || "any").includes("any")) || (m.icons || [])[0];
    return {
      id: String(m.id || m.start_url || link.href),
      name: m.short_name || m.name || document.title,
      icon: icon ? new URL(icon.src, base).href : "",
    };
  } catch { return null; }
}

let state = null; // { app, card, deferred, mode: "prompt" | "ios" }

function render() {
  if (!state?.card) return;
  const t = TEXT[langNow()];
  const c = state.card;
  c.querySelector(".mm-install-title").textContent = t.title(state.app.name);
  c.querySelector(".mm-install-body").textContent = t.body(state.app.name);
  const go = c.querySelector(".mm-install-go");
  go.textContent = state.mode === "ios" ? t.how : t.install;
  c.querySelector(".mm-install-no").textContent = t.later;
  c.querySelector(".mm-install-ios").textContent = t.ios;
}

// The card never covers the app's own floating controls at the bottom (measured 17 Nov: the Zab 🧰 corner button,
// 48px at the bottom right on a phone, and the Zab bar, 44px along the bottom on a computer, both sat on its Install
// button). It reads where the lowest-placed visible fixed control starts and sits 8px above it.
function place() {
  const c = state?.card;
  if (!c || c.hidden) return;
  let top = innerHeight;
  for (const el of document.querySelectorAll("[data-zab] *, [data-zab], .bm-back-row")) {
    if (el === c || c.contains(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.top > innerHeight - 140 && r.top < top) top = r.top;
  }
  c.style.bottom = top < innerHeight ? `${Math.round(innerHeight - top + 8)}px` : "";
}

function hide() {
  if (state?.card) state.card.hidden = true;
}

function show(mode) {
  if (!document.getElementById("mmInstallStyle")) {
    const st = document.createElement("style");
    st.id = "mmInstallStyle";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  if (!state.card) {
    const c = document.createElement("section");
    c.className = "mm-install";
    c.id = "mmInstallCard";
    c.setAttribute("role", "region");
    c.setAttribute("aria-label", "Install");
    c.setAttribute("data-i18n-skip", ""); // its own two languages; never a bn.js key
    c.innerHTML = `<div class="mm-install-row">${state.app.icon ? `<img class="mm-install-icon" alt="" src="${state.app.icon}">` : ""}`
      + `<div class="mm-install-words"><p class="mm-install-title"></p><p class="mm-install-body"></p></div></div>`
      + `<p class="mm-install-ios" hidden></p>`
      + `<div class="mm-install-btns"><button type="button" class="mm-install-no"></button><button type="button" class="mm-install-go"></button></div>`;
    c.querySelector(".mm-install-no").addEventListener("click", () => { setLater(state.app.id); hide(); });
    c.querySelector(".mm-install-go").addEventListener("click", async () => {
      if (state.mode === "ios") { c.querySelector(".mm-install-ios").hidden = false; return; }
      const ev = state.deferred;
      if (!ev) return;
      state.deferred = null; // a prompt can be shown once
      hide();
      try { await ev.prompt(); await ev.userChoice; } catch { /* the browser refused: nothing to do */ }
    });
    document.body.appendChild(c);
    state.card = c;
    window.addEventListener("resize", place);
    new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  state.mode = mode;
  render();
  state.card.hidden = false;
  place();
}

async function start() {
  if (isStandalone()) return;
  const app = await readManifest();
  if (!app) return;
  state = { app, card: null, deferred: null, mode: null };
  window.addEventListener("appinstalled", hide);
  if (window.__mmInstallEarly) take(window.__mmInstallEarly); // an offer that came before this file loaded
  if (laterUntil(app.id) > Date.now()) return;
  if (isIos()) show("ios");
}

function take(ev) {
  if (!state || state.deferred || laterUntil(state.app.id) > Date.now()) return; // "Not now": leave the browser's own offer alone
  ev.preventDefault(); // kept for OUR button, which is made visible in this same moment
  state.deferred = ev;
  show("prompt");
}

window.addEventListener("beforeinstallprompt", (ev) => {
  if (state) take(ev); else window.__mmInstallEarly = ev; // not cancelled: if start() never runs, Chrome keeps its own bar
});

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
