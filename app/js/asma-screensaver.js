// The Asma ul Husna screensaver itself, and its settings panel (Owner, 10 Oct 2026; master file tab 3).
// Loaded only when the screensaver starts or its settings open (screensaver-idle.js imports it on demand), so none
// of this is on any page's startup path.
//
// What it shows: the Owner's template posters (the true copy, decision 85, drawn by asma-poster.js), the 93 photo
// posters (asma-posters.js, archive.org, internet only), or both taking turns. With no internet, the photo posters
// are skipped and the template posters still show.
//
// Closing it changes nothing underneath: it is an overlay over the page the reader was on, so ✕ (or Esc) returns
// them exactly where they were, with focus back where it was (the way-back law, decision 86).
//
// Round 2 (10 Oct 2026): "Ones I'm studying" and the madrasah's own groups and lists need the madrasah's saved Names
// document and this person's records, so loadScreensaverData() reads them ONCE, when the screensaver starts or its
// settings open (never at page startup), and every page then shows the Owner's own corrections and added Names. A
// failed read falls back to all the Names and says so in the settings (I15).
//
// I2: a renderer and a timer. It reads the Names it is handed (the Asma page hands in its own, with the Owner's
// corrections and added Names) or the bundled 99, and it writes nothing except this device's settings.

import { ASMA_NAMES } from "./asma-data.js";
import { ASMA_POSTERS } from "./asma-posters.js";
import { renderAsmaPoster, fitAsmaPosters } from "./asma-poster.js";
import { renderAsmaScreensaverSlide } from "./asma-renderer.js";
import { t } from "./i18n.js";
import { getScreensaverSettings, setScreensaverSettings } from "./screensaver-idle.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";
import { getActiveContext } from "./session-context.js";

export const SCREENSAVER_OPTIONS = Object.freeze({
  idleMin: [[1, "1 min"], [3, "3 min"], [5, "5 min"], [10, "10 min"], [30, "30 min"]],
  eachSec: [[5, "5 sec"], [10, "10 sec"], [15, "15 sec"], [30, "30 sec"], [60, "1 min"], [300, "5 min"]],
  kind: [["tpl", "My template posters"], ["photo", "Photo posters"], ["both", "Both"]],
  which: [["all", "All the Names"], ["fav", "Names I choose"], ["studying", "Ones I'm studying"], ["group", "A group or list"]],
  order: [["seq", "In order"], ["rand", "Random"], ["carry", "Carry on"]],
  move: [["fade", "Fade"], ["kb", "Fade and slow zoom"]],
  night: [["dim", "Dim at night"], ["same", "Same all day"]],
  where: [["any", "Any page"], ["home", "Home only"]],
});

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CSS = `
#mmSaver{position:fixed;inset:0;z-index:20000;background:#000;display:flex;align-items:center;justify-content:center;cursor:none;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#mmSaver[hidden]{display:none}
#mmSaver.dim::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.55);pointer-events:none;z-index:2}
#mmSaver .mms-stage{position:absolute;inset:0}
#mmSaver .mms-slide{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 1.2s ease}
#mmSaver .mms-slide.on{opacity:1}
#mmSaver .mms-slide .ahp{width:min(92vw,calc(92vh * 1055 / 1491))}
#mmSaver .mms-slide .asma-screensaver-slide{text-align:center;color:#fff;max-width:92vw}
#mmSaver .mms-slide .asma-screensaver-img{max-width:92vw;max-height:84vh;border-radius:6px}
#mmSaver .mms-slide .asma-screensaver-caption{margin-top:.8rem;font-size:1.1rem;color:#eee}
#mmSaver .mms-slide.kb>*{animation:mmsKb var(--mms-dur,16s) linear both}
@keyframes mmsKb{from{transform:scale(1)}to{transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){#mmSaver .mms-slide{transition:none}#mmSaver .mms-slide.kb>*{animation:none}}
#mmSaver .mms-clock{position:absolute;top:max(2.5vh,env(safe-area-inset-top));right:3vw;color:rgba(255,255,255,.85);font:600 clamp(18px,3.4vw,34px) system-ui;z-index:3}
#mmSaver .mms-bar{position:absolute;left:0;bottom:0;height:3px;background:#f4501a;width:0;z-index:3}
#mmSaver .mms-ctl{position:absolute;left:50%;bottom:max(4vh,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px;z-index:4;background:rgba(0,0,0,.6);padding:8px;border-radius:14px;opacity:0;transition:opacity .3s;pointer-events:none}
#mmSaver .mms-top{position:absolute;top:max(2.5vh,env(safe-area-inset-top));left:3vw;z-index:4;opacity:0;transition:opacity .3s;pointer-events:none}
#mmSaver.ctl{cursor:default}
#mmSaver.ctl .mms-ctl,#mmSaver.ctl .mms-top{opacity:1;pointer-events:auto}
#mmSaver button{min-width:44px;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);color:#fff;font:inherit;font-size:1rem;cursor:pointer;padding:0 12px}
#mmSaverSettings{position:fixed;inset:0;z-index:19999;background:rgba(15,20,30,.55);display:flex;align-items:center;justify-content:center;padding:16px}
#mmSaverSettings[hidden]{display:none}
#mmSaverSettings .mmss-card{background:#fffdf8;color:#1d2a3a;border-radius:14px;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:14px 16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35)}
#mmSaverSettings h2{font-size:1.1rem;margin:0 0 4px;color:#1f3a5f}
#mmSaverSettings .mmss-sub{font-size:.85rem;color:#5b6675;margin:0 0 8px}
#mmSaverSettings .mmss-row{padding:8px 0;border-top:1px dashed #ddd5c4}
#mmSaverSettings .mmss-lab{font-weight:600;font-size:.9rem;margin-bottom:5px}
#mmSaverSettings .mmss-help{font-size:.78rem;color:#5b6675;margin-top:4px}
#mmSaverSettings .mmss-seg{display:flex;flex-wrap:wrap;gap:6px}
#mmSaverSettings .mmss-seg button,#mmSaverSettings .mmss-btn{border:1px solid #ddd5c4;background:#fff;color:#1d2a3a;border-radius:10px;padding:6px 11px;min-height:40px;font:inherit;font-size:.88rem;cursor:pointer}
#mmSaverSettings .mmss-seg button[aria-pressed="true"]{background:#1f3a5f;color:#fff;border-color:#1f3a5f}
#mmSaverSettings .mmss-btn.primary{background:#f4501a;border-color:#f4501a;color:#fff;font-weight:600}
#mmSaverSettings label.mmss-switch{display:flex;align-items:center;gap:8px;min-height:40px;cursor:pointer;font-size:.9rem}
#mmSaverSettings label.mmss-switch input{width:22px;height:22px;flex:0 0 auto}
#mmSaverSettings .mmss-names{display:flex;flex-wrap:wrap;gap:4px;max-height:180px;overflow:auto;border:1px solid #ddd5c4;border-radius:10px;padding:6px}
#mmSaverSettings .mmss-names label{font-size:.78rem;border:1px solid #ddd5c4;border-radius:999px;padding:2px 8px;display:inline-flex;gap:4px;align-items:center;cursor:pointer}
#mmSaverSettings .mmss-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding-top:10px;border-top:1px solid #ddd5c4;margin-top:6px}
`;

function ensureCss() {
  if (document.getElementById("mmSaverCss")) return;
  const s = document.createElement("style");
  s.id = "mmSaverCss";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** The Names the deck draws from: the caller's (the Asma page's, with the Owner's own edits) or the bundled 99. */
function namesFrom(entries) { return (entries && entries.length ? entries : ASMA_NAMES).filter(Boolean); }

let dataCache = null;

/** Reads, once per tenant and person, the madrasah's Names document (its added Names, corrections and groups) and this
    person's Asma records. Never throws: `failed` says a read did not work, and the callers fall back to all the Names. */
export function loadScreensaverData() {
  const ctx = getActiveContext();
  const key = `${ctx?.tenantId}|${ctx?.selectedPersonId ?? ctx?.personId}`;
  if (dataCache?.key === key) return dataCache.promise;
  const promise = (async () => {
    const out = { entries: null, groups: [], studied: null, failed: false };
    try {
      if (!ctx?.tenantId) throw new Error("no active tenant");
      const [{ auth, db }, C, R, U] = await Promise.all([import("./firebase-init.js"), import("./asma-collections.js"), import("./records.js"), import("./unit-keys.js")]);
      try { await auth.authStateReady?.(); } catch {}
      const docData = await C.getAsmaCollectionsDoc(db, ctx.tenantId);
      const extraNames = C.extraNamesFrom(docData), overrides = C.overridesFrom(docData), overridesEn = C.overridesEnFrom(docData), refOverrides = C.refOverridesFrom(docData);
      const resolve = (n) => C.resolveAsmaEntry(n, { extraNames, overrides, overridesEn, refOverrides });
      out.entries = [...ASMA_NAMES.map((n) => resolve(n.number)), ...C.activeExtraNames(extraNames).map((x) => resolve(x.number))].filter(Boolean);
      out.groups = C.activeCollections(C.collectionsFrom(docData)).map((c) => ({
        id: c.id, title: langText(c.title, getAppLang(), c.id),
        numbers: c.items.map((k) => /^name:(\d+)$/.exec(k)?.[1]).filter(Boolean).map(Number),
      }));
      const personId = ctx.selectedPersonId ?? ctx.personId;
      if (personId) {
        const chunk = await R.getRecordsChunk(db, ctx.tenantId, personId, R.chunkKeyFor(U.buildUnitKey.name(1), "asma_ul_husna"));
        out.studied = new Set();
        for (const [k, v] of Object.entries(chunk?.entries ?? {})) {
          const m = /^name:(\d+)::/.exec(k);
          if (m && v?.claimedStatus && v.claimedStatus !== "not_started") out.studied.add(Number(m[1]));
        }
      }
    } catch (err) {
      console.warn("screensaver: could not read the madrasah's Names or progress (showing all the Names instead):", err?.message || err);
      out.failed = true;
    }
    return out;
  })();
  dataCache = { key, promise };
  return promise;
}

/** The slides, in the order the settings ask for. Exported for its own checks. */
export function buildScreensaverDeck(settings, { entries = null, online = true, random = Math.random, studied = null, groups = [] } = {}) {
  let names = namesFrom(entries);
  if (settings.which === "studying" && studied) {
    const chosen = names.filter((n) => studied.has(Number(n.number)));
    if (chosen.length) names = chosen; // nothing studied yet: all the Names, rather than a screensaver that never shows
  }
  if (settings.which === "group") {
    const g = groups.find((x) => x.id === settings.group);
    const chosen = g ? names.filter((n) => g.numbers.includes(Number(n.number))) : [];
    if (chosen.length) names = chosen; // the group is gone or empty: all the Names
  }
  if (settings.which === "fav") {
    const fav = new Set((settings.fav || []).map(Number));
    const chosen = names.filter((n) => fav.has(Number(n.number)));
    if (chosen.length) names = chosen; // none ticked yet: all the Names, rather than a screensaver that never shows
  }
  const tpl = names.map((entry) => ({ kind: "tpl", entry }));
  const photo = online ? ASMA_POSTERS.map((poster) => ({ kind: "photo", poster })) : [];
  let deck;
  if (settings.kind === "photo") deck = photo.length ? photo : tpl; // offline: the template posters still show
  else if (settings.kind === "both") {
    deck = [];
    for (let i = 0; i < Math.max(tpl.length, photo.length); i++) { if (tpl[i]) deck.push(tpl[i]); if (photo[i]) deck.push(photo[i]); }
  } else deck = tpl;
  if (settings.order === "rand") {
    deck = deck.slice();
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  }
  return deck;
}

/** Where the deck starts: "Carry on" from the Name after the last one shown. */
export function screensaverStartIndex(deck, settings) {
  if (settings.order !== "carry") return 0;
  const at = deck.findIndex((s) => s.kind === "tpl" && Number(s.entry.number) > Number(settings.pos || 0));
  return at < 0 ? 0 : at;
}

let live = null;

export async function runAsmaScreensaver({ entries = null, onClose = () => {} } = {}) {
  if (live) return;
  ensureCss();
  const settings = getScreensaverSettings();
  const data = await loadScreensaverData();
  entries = entries || data.entries; // the Asma page hands in its own; every other page gets the madrasah's, read once
  const deckOpts = { studied: data.studied, groups: data.groups };
  const deck = buildScreensaverDeck(settings, { entries, online: navigator.onLine !== false, ...deckOpts }).slice();
  if (!deck.length) { onClose(); return; }
  const returnFocus = document.activeElement;
  const root = document.createElement("div");
  root.id = "mmSaver";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", t("Asma ul Husna screensaver"));
  root.innerHTML = `<div class="mms-top"><button type="button" data-mms="settings">⚙ ${esc(t("Settings"))}</button></div>
    <div class="mms-clock" aria-hidden="true"></div><div class="mms-stage"></div><div class="mms-bar"></div>
    <div class="mms-ctl"><button type="button" data-mms="prev" aria-label="${esc(t("Previous"))}">‹</button><button type="button" data-mms="pause" aria-label="${esc(t("Pause"))}">❚❚</button><button type="button" data-mms="next" aria-label="${esc(t("Next"))}">›</button><button type="button" data-mms="open">${esc(t("Open this Name"))}</button><button type="button" data-mms="close">✕ ${esc(t("Close"))}</button></div>`;
  document.body.appendChild(root);
  const stage = root.querySelector(".mms-stage"), bar = root.querySelector(".mms-bar"), clock = root.querySelector(".mms-clock");
  let i = 0, t0 = 0, paused = false, raf = 0, ctlTimer = 0, wake = null, photoFails = 0;
  const each = () => Math.max(3, Number(settings.eachSec) || 15) * 1000;

  function show(k) {
    i = (k + deck.length) % deck.length;
    const s = deck[i];
    const el = document.createElement("div");
    el.className = "mms-slide" + (settings.move === "kb" ? " kb" : "");
    el.style.setProperty("--mms-dur", `${each() / 1000 + 1.2}s`);
    el.innerHTML = s.kind === "tpl" ? renderAsmaPoster(s.entry, "screensaver") : renderAsmaScreensaverSlide(s.poster, null);
    // A photo that cannot load is skipped after a moment rather than left as a black screen; three in a row and the
    // internet is taken to be out of reach, so the photos leave the deck and the template posters carry on.
    const img = el.querySelector("img");
    img?.addEventListener("load", () => { photoFails = 0; }, { once: true });
    img?.addEventListener("error", () => setTimeout(() => {
      if (deck[i] !== s || !live) return;
      photoFails += 1;
      if (photoFails >= 3) {
        const tpl = deck.filter((x) => x.kind === "tpl");
        deck.splice(0, deck.length, ...(tpl.length ? tpl : buildScreensaverDeck({ ...settings, kind: "tpl" }, { entries, ...deckOpts })));
        show(0);
      } else show(i + 1);
    }, 1500), { once: true });
    stage.appendChild(el);
    fitAsmaPosters(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    [...stage.children].slice(0, -1).forEach((o) => { o.classList.remove("on"); setTimeout(() => o.remove(), 1300); });
    if (s.kind === "tpl" && Number(s.entry.number) <= 99) setScreensaverSettings({ pos: Number(s.entry.number) });
    root.querySelector('[data-mms="open"]').hidden = s.kind !== "tpl"; // only a template poster is one Name of ours
    t0 = performance.now();
  }
  function tick() {
    const el = performance.now() - t0;
    if (!paused) { bar.style.width = `${Math.min(100, (el / each()) * 100)}%`; if (el >= each()) show(i + 1); }
    const d = new Date();
    clock.textContent = settings.clock ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    root.classList.toggle("dim", settings.night === "dim" && (d.getHours() >= 22 || d.getHours() < 6));
    raf = requestAnimationFrame(tick);
  }
  function showCtl() { root.classList.add("ctl"); clearTimeout(ctlTimer); ctlTimer = setTimeout(() => root.classList.remove("ctl"), 3500); }
  async function keepAwake() {
    if (!settings.wake || !navigator.wakeLock || document.visibilityState !== "visible") return;
    try { wake = await navigator.wakeLock.request("screen"); } catch {}
  }
  const onVis = () => { if (document.visibilityState === "visible") keepAwake(); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowRight") { show(i + 1); showCtl(); }
    else if (e.key === "ArrowLeft") { show(i - 1); showCtl(); }
    else if (e.key === " ") { e.preventDefault(); togglePause(); }
    else showCtl();
  };
  function togglePause() {
    paused = !paused;
    const b = root.querySelector('[data-mms="pause"]');
    b.textContent = paused ? "▶" : "❚❚";
    b.setAttribute("aria-label", paused ? t("Play") : t("Pause"));
    if (!paused) t0 = performance.now();
    showCtl();
  }
  function close() {
    cancelAnimationFrame(raf); clearTimeout(ctlTimer);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("visibilitychange", onVis);
    try { wake?.release(); } catch {}
    try { if (document.fullscreenElement === root) document.exitFullscreen(); } catch {}
    root.remove();
    live = null;
    try { returnFocus?.focus?.({ preventScroll: true }); } catch {}
    onClose();
  }
  root.addEventListener("pointerdown", (e) => { if (!e.target.closest("button")) showCtl(); });
  root.addEventListener("pointermove", showCtl);
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mms]");
    if (!b) return;
    const a = b.dataset.mms;
    if (a === "prev") { show(i - 1); showCtl(); }
    else if (a === "next") { show(i + 1); showCtl(); }
    else if (a === "pause") togglePause();
    else if (a === "close") close();
    else if (a === "open") {
      // Way back (decision 86): the Name's own page opens with back=1, which shows ← Back to where the reader was.
      const s = deck[i];
      if (s?.kind !== "tpl") return;
      close();
      location.href = `./asma-study.html?name=${Number(s.entry.number)}&back=1`;
    }
    else if (a === "settings") { close(); openAsmaScreensaverSettings({ entries, start: (o) => import("./screensaver-idle.js").then((m) => m.startScreensaver({ entries, ...o })) }); }
  });
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("visibilitychange", onVis);
  live = { close };
  show(screensaverStartIndex(deck, settings));
  tick();
  keepAwake();
  // Full screen where the browser allows a page to take it (computers, Android); an iPhone keeps the browser's bar.
  try { if (!document.fullscreenElement && root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" }); } catch {}
  root.querySelector('[data-mms="pause"]').focus({ preventScroll: true });
}

/** The settings panel: every choice applies at once and is kept on this device. */
export function openAsmaScreensaverSettings({ start = null, onChange = () => {}, entries = null } = {}) {
  ensureCss();
  document.getElementById("mmSaverSettings")?.remove();
  const returnFocus = document.activeElement;
  const box = document.createElement("div");
  box.id = "mmSaverSettings";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", t("Screensaver settings"));
  const names = namesFrom(entries);
  let s = getScreensaverSettings();
  const seg = (k) => `<div class="mmss-seg" data-k="${k}">${SCREENSAVER_OPTIONS[k].map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(s[k]) === String(v)}">${esc(t(l))}</button>`).join("")}</div>`;
  const row = (lab, body, help = "") => `<div class="mmss-row"><div class="mmss-lab">${esc(t(lab))}</div>${body}${help ? `<div class="mmss-help">${esc(t(help))}</div>` : ""}</div>`;
  const sw = (k, lab) => `<label class="mmss-switch"><input type="checkbox" data-sw="${k}" ${s[k] ? "checked" : ""}> ${esc(t(lab))}</label>`;
  box.innerHTML = `<div class="mmss-card">
    <h2>🌙 ${esc(t("Asma ul Husna screensaver"))}</h2>
    <p class="mmss-sub">${esc(t("These settings are kept on this device only."))}</p>
    ${row("Turn on", sw("on", "Start by itself when this device is left alone"))}
    ${row("Start after", seg("idleMin"), "How long nothing is touched before it starts.")}
    ${row("Each poster shows for", seg("eachSec"))}
    ${row("Which posters", seg("kind"), "The photo posters need the internet; without it, your template posters show.")}
    ${row("Which Names", seg("which") + `<div class="mmss-names" data-names ${s.which === "fav" ? "" : "hidden"}>${names.map((n) => `<label><input type="checkbox" value="${esc(n.number)}" ${(s.fav || []).map(Number).includes(Number(n.number)) ? "checked" : ""}>${esc(n.number)}. ${esc(n.transliteration)}</label>`).join("")}</div>
      <select class="mmss-btn" data-group aria-label="${esc(t("A group or list"))}" ${s.which === "group" ? "" : "hidden"}></select>
      <div class="mmss-help" data-which-note hidden></div>`)}
    ${row("Order", seg("order"), "Carry on starts from the Name after the last one shown.")}
    ${row("Moving", seg("move"))}
    ${row("Show the time", sw("clock", "A clock in the corner"))}
    ${row("At night", seg("night"), "Dims the screen from 10 pm to 6 am.")}
    ${row("Keep the screen on", sw("wake", "While it runs"), "Where the browser allows it.")}
    ${row("Where it may start", seg("where"), "Never while a recitation plays, while you write on the Writing sheet, or while you type.")}
    <div class="mmss-foot"><button type="button" class="mmss-btn" data-mmss="close">${esc(t("Done"))}</button>${start ? `<button type="button" class="mmss-btn primary" data-mmss="preview">▶ ${esc(t("Start now"))}</button>` : ""}</div>
  </div>`;
  document.body.appendChild(box);
  const save = (patch) => { s = setScreensaverSettings(patch); onChange(s); };
  const close = () => { box.remove(); document.removeEventListener("keydown", onKey, true); try { returnFocus?.focus?.({ preventScroll: true }); } catch {} };
  const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
  document.addEventListener("keydown", onKey, true);
  box.addEventListener("click", (e) => {
    if (e.target === box) { close(); return; }
    const b = e.target.closest("button");
    if (!b) return;
    const segEl = b.closest(".mmss-seg");
    if (segEl) {
      const k = segEl.dataset.k;
      const v = typeof SCREENSAVER_OPTIONS[k][0][0] === "number" ? Number(b.dataset.v) : b.dataset.v;
      save({ [k]: v });
      segEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      if (k === "which") { box.querySelector("[data-names]").hidden = v !== "fav"; box.querySelector("[data-group]").hidden = v !== "group"; showNote(); }
      return;
    }
    if (b.dataset.mmss === "close") close();
    if (b.dataset.mmss === "preview") { close(); start?.({}); }
  });
  box.addEventListener("change", (e) => {
    const el = e.target;
    if (el.matches("[data-group]")) { save({ group: el.value }); showNote(); }
    else if (el.dataset.sw) save({ [el.dataset.sw]: el.checked });
    else if (el.closest("[data-names]")) save({ fav: [...box.querySelectorAll("[data-names] input:checked")].map((x) => Number(x.value)) });
  });
  box.querySelector("button[aria-pressed='true']")?.focus({ preventScroll: true });

  // First use of the madrasah's data: the group list and the studied Names are read now, not at page startup.
  let data = null;
  function showNote() {
    const note = box.querySelector("[data-which-note]");
    let msg = "";
    if (data && (s.which === "studying" || s.which === "group")) {
      if (data.failed) msg = "Could not read your madrasah's groups or your progress, so all the Names show.";
      else if (s.which === "studying" && !data.studied?.size) msg = "You have not started studying any Name yet, so all the Names show.";
    }
    note.textContent = msg ? t(msg) : "";
    note.hidden = !msg;
  }
  loadScreensaverData().then((d) => {
    data = d;
    if (!box.isConnected) return;
    const sel = box.querySelector("[data-group]");
    sel.innerHTML = d.groups.map((g) => `<option value="${esc(g.id)}" ${g.id === s.group ? "selected" : ""}>${esc(g.title)} (${g.numbers.length})</option>`).join("");
    if (d.groups.length && !d.groups.some((g) => g.id === s.group)) save({ group: d.groups[0].id });
    showNote();
  });
}
