// QR J01 R1 (QR-only): Asma ul Husna, the app with NO sign-in and NO Firebase (app/asma.html).
//
// It shows what MMSA shows today in quranrevival.html's Explore -> Asma ul Husna and in asma-study.html, built from
// the same shared modules, copied unchanged from MMSA (commit in docs/QR-PLAN.md's Copy log):
//   - the 99 Names (asma-data.js) and the wheel of the owner's groups (asma-collections-data.js's seed, through
//     asma-local.js, the pure half of asma-collections.js; the original imports Firestore);
//   - each Name: Arabic, name and meaning in English or Bangla, its poster (asma-poster.js), the description strip
//     (asma-descriptions.js), its cited ayat written out (asma-cited-ayat.js + quran-data.js) and its cited hadith
//     (asma-cited-hadith.js, read from the small pre-extracted file tools/qr-asma/extract-cited-hadith.mjs writes);
//   - "Studied" ticks kept in this browser only (localStorage), never sent anywhere.
//
// Every view has its own address (#v=...), so the phone's own Back works and every screen that leaves a view
// shows a visible "<- Back" to exactly where the reader was (the way-back law, MMSA decision 86).

import { ASMA_NAMES } from "./asma-data.js";
import { collectionsFrom, extraNamesFrom, classificationsFrom, activeCollections, membershipsOfName, asmaPositionLabels, resolveAsmaEntry } from "./asma-local.js";
import { asmaEntryDisplayName, asmaEntryMeaningText, renderAsmaXrefBlock, renderAsmaPosterHtml, renderAsmaBelongsToHtml } from "./asma-renderer.js";
import { ensureAsmaPosterStyles, fitAsmaPosters, wireAsmaPosterRefs, asmaCitedHadith, posterHadithHref } from "./asma-poster.js";
import { POSTER_SURAH_NAMES } from "./asma-poster-data.js";
import { mountPosterWithDescriptions } from "./asma-descriptions.js";
import { nameRootsInAyat, renderCitedAyatHtml } from "./asma-cited-ayat.js";
import { renderCitedHadithHtml } from "./asma-cited-hadith.js";
import { OPENITI_LICENCE, OPENITI_CREDIT_URL } from "./openiti-corpus.js";
import { parseAsmaRef } from "./asma-ref-parser.js";
import { getAyah } from "./quran-data.js";
import { renderScopedWheel, attachScopedWheelClickHandler, STATUS_COLORS } from "./mastery-wheel.js";
import { chooseSliceLines, fitWheelLabels } from "./asma-wheel-fit.js";
import { t, num, surahName, ensureCatalogueReady } from "./i18n.js";
import { langText } from "./lang.js";
import { getAppLang, setAppLang, getCardLook, setCardLook } from "./prefs.js";
import { tr } from "./asma-app-strings.js";
import { armScreensaver, startScreensaver, openScreensaverSettings, setScreensaverData } from "./qr-screensaver.js";
import { registerQrServiceWorker, applyUpdate, countSaved, saveForOffline } from "./qr-sw-register.js";

/** Where a Name's poster sits. false (today's MMSA way): behind a "🖼 Poster" button. true: shown on the Name's
 *  page straight away (a tap still opens it full size). The owner chooses. */
export const POSTER_INLINE = true;

/** MMSA's Hadith library, where "Open in Hadith ↗" goes (Hadith stays MMSA's; QR only links to it). */
const HADITH_LIBRARY = "https://madrasatul-muslimeen.github.io/app/hadith-collections.html";
const CITED_HADITH_URL = "../tools/hadith-data-pull/output/asma-cited-hadith.json";
const STUDIED_KEY = "qr_asma_studied_v1";
const SCROLL_KEY = "qr_asma_scroll"; // sessionStorage: this tab's place on the page, for the way back

// ---------------------------------------------------------------------------------------------------------------
// The poster's own stylesheet, WITHOUT its Google Fonts link. asma-poster.js adds both the first time a poster is
// drawn; it takes the document to add them to, so it is handed one that passes the <style> through and drops the
// <link>. Its two faces (Tinos, Noto Naskh Arabic) come from app/css/qr-fonts.css instead, served from this site.
// ---------------------------------------------------------------------------------------------------------------
ensureAsmaPosterStyles({
  createElement: (tag) => document.createElement(tag),
  head: { appendChild: (el) => (el.tagName === "LINK" ? el : document.head.appendChild(el)) },
});

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------------------------------------------
// The Names and the owner's groups (seed data: no madrasah document without sign-in).
// ---------------------------------------------------------------------------------------------------------------
/** Group titles the app shows differently from the seed (asma-collections-data.js stays byte-identical with MMSA).
 *  Group 19's seed title is the owner's own editing note ("Not yet placed — organize these yourself"), which
 *  students must not see (QR Architect review of R1). */
export const GROUP_TITLE_OVERRIDES = Object.freeze({
  asmacat_19: { en: "Other Names", bn: "অন্যান্য নাম" },
});
const EXTRA_NAMES = extraNamesFrom(null);
const COLLECTIONS = collectionsFrom(null).map((c) => (GROUP_TITLE_OVERRIDES[c.id] ? { ...c, title: GROUP_TITLE_OVERRIDES[c.id] } : c));
const CLASSIFICATIONS = classificationsFrom(null);
const GROUPS = activeCollections(COLLECTIONS).filter((c) => c.kind === "group");
const resolve = (n) => resolveAsmaEntry(n, { extraNames: EXTRA_NAMES });
const groupById = (id) => GROUPS.find((g) => g.id === id) ?? null;
const groupNumbers = (g) => g.items.map((uk) => Number(uk.split(":")[1])).filter((n) => resolve(n));

// ---------------------------------------------------------------------------------------------------------------
// "Studied", on this device only.
// ---------------------------------------------------------------------------------------------------------------
function readStudied() {
  try {
    const list = JSON.parse(localStorage.getItem(STUDIED_KEY) || "[]");
    return new Set(Array.isArray(list) ? list.filter(Number.isInteger) : []);
  } catch { return new Set(); }
}
let studied = readStudied();
function setStudied(n, on) {
  if (on) studied.add(n); else studied.delete(n);
  try { localStorage.setItem(STUDIED_KEY, JSON.stringify([...studied].sort((a, b) => a - b))); } catch { /* private window: this visit only */ }
}
addEventListener("storage", (e) => { if (e.key === STUDIED_KEY) { studied = readStudied(); show(current, { keepScroll: true }); } });

// ---------------------------------------------------------------------------------------------------------------
// Addresses. #v=names | groups | group&g=ID | name&n=N[&g=ID] | poster&n=N[&g=ID]
// ---------------------------------------------------------------------------------------------------------------
function parseRoute(hash = location.hash) {
  const p = new URLSearchParams(String(hash).replace(/^#/, ""));
  const v = p.get("v") || "names";
  const n = Number(p.get("n"));
  const g = p.get("g") && groupById(p.get("g")) ? p.get("g") : null;
  if ((v === "name" || v === "poster") && Number.isInteger(n) && resolve(n)) return { v, n, g };
  if (v === "group" && g) return { v, g };
  if (v === "groups") return { v };
  return { v: "names" };
}
function routeHash(r) {
  const p = new URLSearchParams({ v: r.v });
  if (r.n != null) p.set("n", String(r.n));
  if (r.g) p.set("g", r.g);
  return `#${p}`;
}
const sameRoute = (a, b) => !!a && !!b && routeHash(a) === routeHash(b);
/** The view a Back button returns to. */
function parentOf(r) {
  if (r.v === "poster") return { v: "name", n: r.n, g: r.g };
  if (r.v === "name") return r.g ? { v: "group", g: r.g } : { v: "names" };
  if (r.v === "group") return { v: "groups" };
  return { v: "names" };
}

let current = parseRoute();
const scrollByRoute = new Map();
let lastOpenedName = null; // the card to bring back into view on the way back

function nav(r, { replace = false } = {}) {
  scrollByRoute.set(routeHash(current), scrollY);
  const state = { r, from: replace ? (history.state?.from ?? null) : current };
  history[replace ? "replaceState" : "pushState"](state, "", routeHash(r));
  show(r);
}
/** Back: the browser's own step back when that IS the parent view (so its history stays tidy), else straight there. */
function backTo(parent) {
  if (sameRoute(history.state?.from, parent)) history.back();
  else nav(parent, { replace: true });
}
addEventListener("popstate", () => show(parseRoute()));
addEventListener("pagehide", () => {
  try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ hash: location.hash, y: Math.round(scrollY) })); } catch { /* storage blocked */ }
});
/** The way back's place, again, now that more of the page is here (see the first paint, at the end). */
function retryRestore() {
  if (restoreY == null) return;
  scrollTo(0, restoreY);
  if (Math.abs(scrollY - restoreY) < 2) restoreY = null;
}

// ---------------------------------------------------------------------------------------------------------------
// The page frame: tabs, language and look.
// ---------------------------------------------------------------------------------------------------------------
const viewEl = document.getElementById("qaView");
const overlayEl = document.getElementById("qaPosterOverlay");
const overlayMount = document.getElementById("qaPosterMount");
const overlayBack = document.getElementById("qaPosterBack");
const overlayClose = document.getElementById("qaPosterClose");

function paintFrame() {
  const lang = getAppLang();
  document.documentElement.lang = lang;
  document.title = lang === "bn" ? `${t("Asma ul Husna")} · QuranRevival` : "Asma ul Husna · QuranRevival";
  document.querySelectorAll("[data-qa-text]").forEach((el) => { el.textContent = tr(el.dataset.qaText); });
  document.querySelectorAll("[data-qa-label]").forEach((el) => { el.setAttribute("aria-label", tr(el.dataset.qaLabel)); el.title = tr(el.dataset.qaLabel); });
  document.querySelectorAll("[data-qa-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.qaLang === lang)));
  document.querySelectorAll("[data-qa-look]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.qaLook === getCardLook())));
  const tab = current.v === "groups" || current.v === "group" || ((current.v === "name" || current.v === "poster") && current.g) ? "groups" : "names";
  document.querySelectorAll("[data-qa-tab]").forEach((b) => b.setAttribute("aria-current", b.dataset.qaTab === tab ? "page" : "false"));
}

document.querySelectorAll("[data-qa-tab]").forEach((b) => b.addEventListener("click", () => nav({ v: b.dataset.qaTab })));
document.querySelectorAll("[data-qa-lang]").forEach((b) => b.addEventListener("click", async () => {
  if (b.dataset.qaLang === getAppLang()) return;
  setAppLang(b.dataset.qaLang);
  await ensureCatalogueReady();
  show(current, { keepScroll: true });
  if (!offlineEl.hidden) paintOffline();
}));
document.querySelectorAll("[data-qa-look]").forEach((b) => b.addEventListener("click", () => { setCardLook(b.dataset.qaLook); paintFrame(); }));

// ---------------------------------------------------------------------------------------------------------------
// Views.
// ---------------------------------------------------------------------------------------------------------------
let renderToken = 0;
let renderedView = null; // the address of what is drawn in #qaView (the poster draws over its Name)
function show(r, { keepScroll = false } = {}) {
  const view = r.v === "poster" ? routeHash({ v: "name", n: r.n, g: r.g }) : routeHash(r);
  const redraw = keepScroll || view !== renderedView;
  const y = keepScroll ? scrollY : scrollByRoute.get(routeHash(r));
  current = r;
  paintFrame();
  if (redraw) {
    renderToken++;
    renderedView = view;
    if (r.v === "groups") renderGroups();
    else if (r.v === "group") renderGroup(r.g);
    else if (r.v === "name" || r.v === "poster") renderName(r.n, r.g);
    else renderNames();
  }
  if (r.v === "poster") openPoster(r.n, r.g); else closePoster();
  if (!redraw && !keepScroll) return; // back from the poster: the Name is still there, at the same place
  // Way back: the place on the page the reader left, and the Name they had opened.
  const card = lastOpenedName != null && r.v !== "name" && r.v !== "poster"
    ? viewEl.querySelector(`[data-qa-name="${lastOpenedName}"]`) : null;
  if (y != null) scrollTo(0, y);
  else if (card) card.scrollIntoView({ block: "center" });
  else if (r.v !== "poster") scrollTo(0, 0);
  if (card) card.focus({ preventScroll: true });
}

function studiedLine() {
  const n = ASMA_NAMES.filter((x) => studied.has(x.number)).length;
  return tr("{n} of {total} studied on this device", { n: num(n), total: num(99) });
}

function renderNames() {
  const cards = ASMA_NAMES.map((n) => {
    const e = resolve(n.number);
    const done = studied.has(n.number);
    return `<button type="button" class="qa-card${done ? " studied" : ""}" data-qa-name="${n.number}">
      <span class="qa-card-num">${num(n.number)}</span>${done ? `<span class="qa-card-tick" title="${esc(tr("Studied on this device"))}" aria-label="${esc(tr("Studied on this device"))}">✓</span>` : ""}
      <span class="qa-card-ar" lang="ar" dir="rtl">${esc(e.arabic)}</span>
      <span class="qa-card-name">${esc(asmaEntryDisplayName(e))}</span>
      <span class="qa-card-mean">${esc(asmaEntryMeaningText(e))}</span>
    </button>`;
  }).join("");
  viewEl.innerHTML = `<section class="qa-intro">
      <h1 class="qa-h1">${esc(tr("The 99 Names of Allah"))}</h1>
      <p class="qa-sub"><span data-qa-studied-count>${esc(studiedLine())}</span> · ${esc(tr("Tap a Name to open it."))}</p>
    </section>
    <div class="qa-grid" data-qa-grid>${cards}</div>`;
  viewEl.querySelectorAll("[data-qa-name]").forEach((b) => b.addEventListener("click", () => openName(Number(b.dataset.qaName), null)));
}

/** Every slice label inside its own slice, no word cut (asma-wheel-fit.js); again once the fonts are in. */
function fitWheel() {
  const svg = viewEl.querySelector("[data-qa-wheel] svg");
  fitWheelLabels(svg);
  document.fonts?.ready.then(() => { if (svg?.isConnected) fitWheelLabels(svg); });
}

function renderGroups() {
  const title = t("All Groups");
  const items = GROUPS.map((g, i) => {
    const nums = groupNumbers(g);
    const label = esc(langText(g.title, getAppLang()));
    return {
      key: g.id, statusId: "not_started", title: label, number: num(i + 1),
      // A slice fills from the hub as its Names are studied on this device.
      progress: nums.length ? nums.filter((n) => studied.has(n)).length / nums.length : 0,
      sliceLines: chooseSliceLines(langText(g.title, getAppLang()), i, GROUPS.length).map(esc),
    };
  });
  const rows = GROUPS.map((g, i) => {
    const nums = groupNumbers(g);
    const done = nums.filter((n) => studied.has(n)).length;
    return `<button type="button" class="qa-row" data-qa-group="${esc(g.id)}">
      <span class="qa-badge">${num(i + 1)}</span>
      <span class="qa-row-main"><span class="qa-row-title">${esc(langText(g.title, getAppLang()))}</span>
      <span class="qa-row-sub">${esc(t("{count} Names", { count: num(nums.length) }))}${done ? ` · ${esc(tr("{n} studied", { n: num(done) }))}` : ""}</span></span>
      <span class="qa-row-go" aria-hidden="true">›</span>
    </button>`;
  }).join("");
  viewEl.innerHTML = `<div class="qa-wheel-layout">
      <section class="qa-wheel-card">
        <h1 class="qa-h1">${esc(title)}</h1>
        <div class="qa-wheel" data-qa-wheel>${renderScopedWheel(items, { centerLabel: esc(title), roomForNumbers: true })}</div>
        <p class="qa-hint">${esc(t("Tap a group to see the Names inside it."))}</p>
      </section>
      <section class="qa-list" aria-label="${esc(title)}">${rows}</section>
    </div>`;
  fitWheel();
  attachScopedWheelClickHandler(viewEl.querySelector("[data-qa-wheel]"), (key) => nav({ v: "group", g: key }));
  viewEl.querySelectorAll("[data-qa-group]").forEach((b) => b.addEventListener("click", () => nav({ v: "group", g: b.dataset.qaGroup })));
}

function legendHtml() {
  return `<div class="qa-legend">
    <span><i style="background:${STATUS_COLORS.mastered}"></i>${esc(tr("Studied on this device"))}</span>
    <span><i style="background:${STATUS_COLORS.not_started}"></i>${esc(tr("Not studied yet"))}</span>
  </div>`;
}

function renderGroup(groupId) {
  const g = groupById(groupId);
  const title = langText(g.title, getAppLang());
  const nums = groupNumbers(g);
  const { runningByKey } = asmaPositionLabels(GROUPS);
  const items = nums.map((n, i) => {
    const e = resolve(n);
    const key = `name:${n}`;
    return {
      key, statusId: studied.has(n) ? "mastered" : "not_started", title: esc(asmaEntryDisplayName(e)),
      number: num(runningByKey.get(key) ?? n),
      sliceLines: chooseSliceLines(asmaEntryDisplayName(e), i, nums.length, { lead: [e.arabic] }).map(esc),
      sliceArabicLines: 1,
    };
  });
  const rows = nums.map((n) => {
    const e = resolve(n);
    const done = studied.has(n);
    return `<button type="button" class="qa-row qa-name-row${done ? " studied" : ""}" data-qa-name="${n}">
      <span class="qa-badge">${num(runningByKey.get(`name:${n}`) ?? n)}</span>
      <span class="qa-row-main"><span class="qa-row-title"><span class="qa-row-ar" lang="ar" dir="rtl">${esc(e.arabic)}</span> ${esc(asmaEntryDisplayName(e))}</span>
      <span class="qa-row-sub">${esc(asmaEntryMeaningText(e))}</span></span>
      ${done ? `<span class="qa-row-tick" aria-label="${esc(tr("Studied on this device"))}">✓</span>` : `<span class="qa-row-go" aria-hidden="true">›</span>`}
    </button>`;
  }).join("");
  viewEl.innerHTML = `<div class="qa-backbar"><button type="button" class="qa-back" data-qa-back>← ${esc(tr("Back to all groups"))}</button></div>
    <div class="qa-wheel-layout">
      <section class="qa-wheel-card">
        <h1 class="qa-h1">${esc(title)}</h1>
        <p class="qa-sub">${esc(t("{count} Names", { count: num(nums.length) }))}</p>
        <div class="qa-wheel" data-qa-wheel>${renderScopedWheel(items, { centerLabel: esc(title), roomForNumbers: true })}</div>
        ${legendHtml()}
        <p class="qa-hint">${esc(t("Tap a Name to see the Ayat and Hadith it's linked to."))}</p>
      </section>
      <section class="qa-list" aria-label="${esc(title)}">${rows}</section>
    </div>`;
  viewEl.querySelector("[data-qa-back]").addEventListener("click", () => backTo({ v: "groups" }));
  fitWheel();
  attachScopedWheelClickHandler(viewEl.querySelector("[data-qa-wheel]"), (key) => openName(Number(key.split(":")[1]), groupId));
  viewEl.querySelectorAll("[data-qa-name]").forEach((b) => b.addEventListener("click", () => openName(Number(b.dataset.qaName), groupId)));
}

function openName(n, groupId) {
  lastOpenedName = n;
  nav({ v: "name", n, g: groupId });
}

/** The Names ‹ › steps through: the open group's own order, else the 99 in order (MMSA's asmaXNameOrder()). */
function nameOrder(groupId) {
  const g = groupId ? groupById(groupId) : null;
  return g ? groupNumbers(g) : ASMA_NAMES.map((x) => x.number);
}

function memberships(n) {
  return membershipsOfName(COLLECTIONS, n).map((m) => {
    const col = COLLECTIONS.find((c) => c.id === m.collectionId);
    const cls = CLASSIFICATIONS.find((c) => c.key === m.kind);
    return { collectionId: m.collectionId, collectionTitle: col?.title ?? { en: "" }, classificationKey: m.kind, classificationTitle: cls?.title ?? { en: m.kind } };
  });
}

function renderName(n, groupId) {
  const e = resolve(n);
  const order = nameOrder(groupId);
  let at = order.indexOf(n);
  if (at < 0) { groupId = null; at = n - 1; }
  const list = groupId ? order : nameOrder(null);
  const prev = at > 0 ? list[at - 1] : null;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  const group = groupId ? groupById(groupId) : null;
  const backLabel = group ? t("Back to {name}", { name: langText(group.title, getAppLang()) }) : tr("Back to the 99 Names");
  const pos = group ? tr("{n} of {total} in this group", { n: num(at + 1), total: num(list.length) }) : t("{n} of {total}", { n: num(at + 1), total: num(list.length) });
  const done = studied.has(n);
  const badges = [
    e.isExtra ? `<span class="qa-tag">${esc(t("Beyond the 99"))}</span>` : "",
    e.isPhrase ? `<span class="qa-tag">${esc(t("Honorific phrase"))}</span>` : "",
    e.weak ? `<span class="qa-tag weak">${esc(t("Weak / disputed hadith"))}</span>` : "",
  ].join("");
  const posterInline = POSTER_INLINE
    ? `<button type="button" class="qa-poster-inline" data-qa-poster aria-label="${esc(t("Poster"))}: ${esc(asmaEntryDisplayName(e))}">${renderAsmaPosterHtml(e, "explore")}</button>
       <p class="qa-hint">${esc(t("Tap the poster to see it full size."))}</p>`
    : "";
  viewEl.innerHTML = `<div class="qa-backbar">
      <button type="button" class="qa-back" data-qa-back>← ${esc(backLabel)}</button>
      <span class="qa-nav">
        <button type="button" class="qa-nav-btn" data-qa-prev aria-label="${esc(t("Previous Name"))}" title="${esc(t("Previous Name"))}"${prev == null ? " disabled" : ""}>‹</button>
        <span class="qa-pos" data-qa-pos>${esc(pos)}</span>
        <button type="button" class="qa-nav-btn" data-qa-next aria-label="${esc(t("Next Name"))}" title="${esc(t("Next Name"))}"${next == null ? " disabled" : ""}>›</button>
      </span>
    </div>
    <div class="qa-detail" data-qa-detail="${n}">
      <article class="qa-namecard">
        <div class="qa-num">${e.isExtra ? `#${num(n)}` : esc(t("{n} of {total}", { n: num(n), total: num(99) }))}</div>
        <div class="qa-ar" lang="ar" dir="rtl" data-qa-arabic>${esc(e.arabic)}</div>
        <h1 class="qa-name" data-qa-title>${esc(asmaEntryDisplayName(e))}</h1>
        <p class="qa-mean" data-qa-meaning>${esc(asmaEntryMeaningText(e))}</p>
        ${badges ? `<p class="qa-tags">${badges}</p>` : ""}
        <div class="qa-actions">
          <button type="button" class="qa-studied${done ? " on" : ""}" data-qa-studied aria-pressed="${done}">${esc(done ? tr("Studied ✓") : tr("Mark as studied"))}</button>
          ${POSTER_INLINE ? "" : `<button type="button" class="qa-btn" data-qa-poster>🖼 ${esc(t("Poster"))}</button>`}
        </div>
        <p class="qa-device-note">${esc(tr("Kept on this device only. It does not move to another phone."))}</p>
        ${posterInline}
        ${renderAsmaXrefBlock(e, { inPage: true })}
        ${renderAsmaBelongsToHtml(memberships(n))}
      </article>
      <div class="qa-cited-col">
        <section id="qaCitedAyat" class="asmax-cited" hidden></section>
        <section id="qaCitedHadith" class="asmax-cited" hidden></section>
      </div>
    </div>`;
  viewEl.querySelector("[data-qa-back]").addEventListener("click", () => backTo(parentOf({ v: "name", n, g: groupId })));
  viewEl.querySelector("[data-qa-prev]").addEventListener("click", () => { if (prev != null) { lastOpenedName = prev; nav({ v: "name", n: prev, g: groupId }, { replace: true }); } });
  viewEl.querySelector("[data-qa-next]").addEventListener("click", () => { if (next != null) { lastOpenedName = next; nav({ v: "name", n: next, g: groupId }, { replace: true }); } });
  viewEl.querySelector("[data-qa-studied]").addEventListener("click", (ev) => {
    const on = !studied.has(n);
    setStudied(n, on);
    const b = ev.currentTarget;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? tr("Studied ✓") : tr("Mark as studied");
  });
  viewEl.querySelectorAll("[data-qa-poster]").forEach((b) => b.addEventListener("click", () => nav({ v: "poster", n, g: groupId })));
  viewEl.querySelectorAll("[data-asma-xref-jump]").forEach((b) => b.addEventListener("click", () => scrollToAyah(b.dataset.asmaXrefJump)));
  viewEl.querySelectorAll("[data-asma-belongs-jump]").forEach((b) => b.addEventListener("click", () => nav({ v: "group", g: b.dataset.asmaBelongsJump.split(":")[1] })));
  if (POSTER_INLINE) requestAnimationFrame(() => fitAsmaPosters(viewEl));
  renderCitedAyat(e, renderToken);
  renderCitedHadith(e, renderToken);
}

function scrollToAyah(key) {
  const el = document.querySelector(`[data-asmax-cited="${CSS.escape(key)}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.classList.remove("qa-flash");
  void el.offsetWidth;
  el.classList.add("qa-flash");
}

const refLabel = (s, a) => `${surahName(s, POSTER_SURAH_NAMES[s - 1])} ${num(s)}:${num(a)}`;

async function renderCitedAyat(entry, token) {
  const section = document.getElementById("qaCitedAyat");
  const seen = new Set();
  const cites = (entry?.ref ? parseAsmaRef(entry.ref) : [])
    .filter((c) => c.kind === "quran" && !seen.has(`${c.surah}:${c.ayah}`) && seen.add(`${c.surah}:${c.ayah}`));
  if (!section || !cites.length) return;
  section.hidden = false;
  section.innerHTML = `<p class="hint">${esc(t("Loading…"))}</p>`;
  const ayat = await Promise.all(cites.map(async ({ surah, ayah }) => {
    try { return { surah, ayah, data: await getAyah(surah, ayah) }; } catch (err) { console.warn(err); return { surah, ayah, data: null }; }
  }));
  if (token !== renderToken) return; // the reader moved on while it loaded
  const name = asmaEntryDisplayName(entry);
  section.innerHTML = renderCitedAyatHtml({
    ayat, roots: nameRootsInAyat(entry.arabic, ayat), heading: t("The āyāt {name} is named in", { name }),
    t, escapeHtml: esc, num, refLabel, lang: getAppLang() === "bn" ? "bn" : "en",
  });
  // There is no Word card or Ayah card in this app yet: a word shows its meaning in place, and the
  // "Ayah card" buttons are left out.
  section.querySelector(".asmax-cited-hint")?.replaceChildren(tr("Tap a word to see its meaning."));
  section.querySelectorAll(".asmax-cited-card").forEach((b) => b.closest(".asmax-cited-acts")?.remove());
  section.querySelectorAll("[data-asmax-cited-word]").forEach((b) => b.addEventListener("click", () => {
    const art = b.closest(".asmax-cited-ayah");
    art.querySelectorAll(".asmax-cited-word.sel").forEach((x) => x.classList.remove("sel"));
    b.classList.add("sel");
    let gloss = art.querySelector(".qa-gloss");
    if (!gloss) {
      gloss = document.createElement("p");
      gloss.className = "qa-gloss";
      gloss.setAttribute("role", "status");
      art.querySelector(".asmax-cited-words").after(gloss);
    }
    gloss.textContent = b.getAttribute("aria-label");
  }));
  retryRestore();
}

let citedHadithPromise = null;
function loadCitedHadithFile() {
  if (!citedHadithPromise) {
    citedHadithPromise = fetch(CITED_HADITH_URL).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load the cited hadith (HTTP ${r.status}).`);
      return r.json();
    }).catch((err) => { citedHadithPromise = null; throw err; });
  }
  return citedHadithPromise;
}

/** The library's address for a passage, on MMSA's site, in a new tab (so this page stays where it was). */
function libraryHref(link) {
  return posterHadithHref(link, HADITH_LIBRARY).replace(/&back=1$/, "");
}
function pointAtLibrary(root) {
  root.querySelectorAll("a[data-asmax-hadith-open], a[data-poster-hadith]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const m = href.match(/openiti=([^&]+)&passage=(\d+)/);
    if (m) a.href = libraryHref({ openiti: { versionUri: decodeURIComponent(m[1]), n: Number(m[2]) } });
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (a.matches("[data-asmax-hadith-open]")) a.textContent = tr("Open in Hadith ↗");
  });
}

async function renderCitedHadith(entry, token) {
  const section = document.getElementById("qaCitedHadith");
  const cites = asmaCitedHadith(entry);
  if (!section || !cites.length) return;
  section.hidden = false;
  section.innerHTML = `<p class="hint">${esc(t("Loading…"))}</p>`;
  let file = null, failed = false;
  if (cites.some((c) => c.link)) {
    try { file = await loadCitedHadithFile(); } catch (err) { console.warn(err); failed = true; }
  }
  if (token !== renderToken) return;
  const items = cites.map((cite) => {
    if (!cite.link) return { cite, loaded: null, failed: false };
    const loaded = file?.items?.[cite.key] ?? null;
    return { cite, loaded, failed: failed || !loaded };
  });
  section.innerHTML = renderCitedHadithHtml({
    items, heading: t("The hadith {name} is named in", { name: asmaEntryDisplayName(entry) }),
    t, escapeHtml: esc, num, lang: getAppLang() === "bn" ? "bn" : "en",
  }) + (items.some((i) => i.loaded)
    ? `<p class="hint qa-credit"><a href="${esc(OPENITI_CREDIT_URL)}" target="_blank" rel="noopener noreferrer">${esc(tr("Arabic text: OpenITI ({licence})", { licence: OPENITI_LICENCE }))}</a></p>`
    : "");
  pointAtLibrary(section);
  retryRestore();
}

// ---------------------------------------------------------------------------------------------------------------
// The poster, full size: its own view, with a visible "<- Back to <Name>".
// ---------------------------------------------------------------------------------------------------------------
function openPoster(n, groupId) {
  const e = resolve(n);
  overlayEl.hidden = false;
  document.body.classList.add("qa-poster-open");
  overlayBack.textContent = `← ${t("Back to {name}", { name: asmaEntryDisplayName(e) })}`;
  overlayBack.onclick = () => backTo({ v: "name", n, g: groupId });
  overlayClose.onclick = overlayBack.onclick;
  overlayClose.setAttribute("aria-label", t("Close"));
  overlayClose.title = t("Close");
  overlayEl.scrollTop = 0;
  mountPosterWithDescriptions(overlayMount, {
    entry: e,
    madrasahDescriptions: {}, // a madrasah's own descriptions need sign-in (QR J02)
    canEdit: false,
    renderPoster: (description) => renderAsmaPosterHtml(e, "standalone", { interactive: true, description }),
    afterRender: () => {
      fitAsmaPosters(overlayMount);
      pointAtLibrary(overlayMount);
      wireAsmaPosterRefs(overlayMount, {
        // A Qur'an reference on the poster: back to the Name, at that ayah, written out.
        onQuran: (surah, ayah) => {
          backTo({ v: "name", n, g: groupId });
          setTimeout(() => waitThenScroll(`${surah}:${ayah}`), 50);
        },
      });
    },
    onSave: async () => false,
  });
  requestAnimationFrame(() => fitAsmaPosters(overlayMount));
}
function waitThenScroll(key, tries = 40) {
  if (document.querySelector(`[data-asmax-cited="${CSS.escape(key)}"] .asmax-cited-words`) || tries <= 0) scrollToAyah(key);
  else setTimeout(() => waitThenScroll(key, tries - 1), 100);
}
function closePoster() {
  if (overlayEl.hidden) return;
  overlayEl.hidden = true;
  overlayMount.innerHTML = "";
  document.body.classList.remove("qa-poster-open");
}
overlayEl.addEventListener("click", (ev) => { if (ev.target === overlayEl) overlayBack.click(); });
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !overlayEl.hidden) overlayBack.click(); });
let fitting = 0;
addEventListener("resize", () => { cancelAnimationFrame(fitting); fitting = requestAnimationFrame(() => fitAsmaPosters(document)); });

// First paint: the address decides the view (a reload keeps the reader where they were).
history.replaceState({ r: current, from: history.state?.from ?? null }, "", routeHash(current));
if (current.v === "name" || current.v === "poster") lastOpenedName = current.n;
// Way back from another page (About, the Hadith library): the browser reloads this page, and a Name's āyāt and
// hadith arrive a moment later, so the browser's own scroll restore lands short. The place is kept here instead,
// and set again as each part arrives, until the page is long enough to reach it.
try { history.scrollRestoration = "manual"; } catch { /* old browser */ }
let restoreY = null;
try {
  const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "null");
  const nav = performance.getEntriesByType?.("navigation")?.[0]?.type;
  if (saved && saved.hash === location.hash && (nav === "back_forward" || nav === "reload")) restoreY = saved.y;
} catch { /* storage blocked */ }
if (restoreY != null) scrollByRoute.set(routeHash(current), restoreY);
show(current);
retryRestore();
document.documentElement.classList.add("qa-ready");

// ---------------------------------------------------------------------------------------------------------------
// Offline (R2). The page and everything it needs are saved when the worker installs. The Qur'an files the Names
// cite (51 surahs, 19 MB) are saved as each is first opened, or all at once by the reader's "Save for offline":
// 19 MB is too much to take unasked on a first visit over a phone's data.
// ---------------------------------------------------------------------------------------------------------------
/** The surah files the Names cite, at quran-data.js's own address (its BASE_URL). */
export const CITED_SURAH_URLS = (() => {
  const nums = new Set();
  const all = [...ASMA_NAMES.map((n) => n.number), ...EXTRA_NAMES.map((e) => e.number)];
  for (const n of all) for (const c of parseAsmaRef(resolve(n)?.ref ?? "")) if (c.kind === "quran") nums.add(c.surah);
  return [...nums].sort((a, b) => a - b).map((s) => `/tools/quran-data-pull/output/surahs/surah_${String(s).padStart(3, "0")}.json`);
})();

const offlineEl = document.querySelector("[data-qa-offline]");
const offlineBtn = document.querySelector("[data-qa-offline-save]");
const offlineNote = document.querySelector("[data-qa-offline-note]");
let offlineState = { saved: 0, saving: false, failed: 0 };
function paintOffline() {
  const total = CITED_SURAH_URLS.length;
  const { saved, saving, failed } = offlineState;
  offlineBtn.hidden = saved >= total && !saving;
  offlineBtn.disabled = saving;
  offlineBtn.textContent = tr("Save all āyāt for offline use (19 MB)");
  offlineNote.textContent = saving ? tr("Saving… {n} of {total}", { n: num(saved), total: num(total) })
    : saved >= total ? tr("Ready for offline use ✓")
    : failed ? tr("Some could not be saved. Check the connection and try again.")
    : tr("The Names work offline. The āyāt you have opened are saved too.");
}
async function startOffline() {
  // Switched off (?nosw, mm_disable_service_worker): registerQrServiceWorker() unregisters and returns null.
  const reg = await registerQrServiceWorker({ onUpdateReady: () => { document.querySelector("[data-qa-update]").hidden = false; } });
  if (!reg || !("caches" in self)) return;
  offlineState.saved = await countSaved(CITED_SURAH_URLS).catch(() => 0);
  offlineEl.hidden = false;
  paintOffline();
}
offlineBtn.addEventListener("click", async () => {
  offlineState = { saved: 0, saving: true, failed: 0 };
  paintOffline();
  const failed = await saveForOffline(CITED_SURAH_URLS, (done) => { offlineState.saved = done; paintOffline(); });
  offlineState = { saved: await countSaved(CITED_SURAH_URLS), saving: false, failed };
  paintOffline();
});
document.querySelector("[data-qa-update-reload]").addEventListener("click", () => applyUpdate());

// ---------------------------------------------------------------------------------------------------------------
// The 🌙 screensaver (R3): MMSA's, over this page, with this app's Names, groups and Studied ticks. Any tap or key
// closes it, and the page underneath was never touched, so the reader is exactly where they were.
// ---------------------------------------------------------------------------------------------------------------
setScreensaverData(() => ({
  entries: [...ASMA_NAMES.map((n) => resolve(n.number)), ...EXTRA_NAMES.filter((e) => e.status === "active").map((e) => resolve(e.number))].filter(Boolean),
  groups: GROUPS.map((g) => ({ id: g.id, title: langText(g.title, getAppLang()), numbers: groupNumbers(g) })),
  studied: new Set(studied),
  failed: false,
}));
document.querySelector("[data-qa-saver]").addEventListener("click", () => startScreensaver());
document.querySelector("[data-qa-saver-settings]").addEventListener("click", () => openScreensaverSettings());
armScreensaver();
startOffline();
