// Zab round Z2 (PCF J25, issue #823) -- the Zab bar and plain pockets.
//
// MOUNTED FROM ONE PLACE. sw-register.js (which every app page already calls)
// imports this file ONLY when zab-readiness.js says ready, so while the gate is
// shut none of this code is even fetched, nothing appears and nothing reads or
// writes Firestore. Owner answers 1 B (the bar is on every MMSA page), 3 B (one
// shared family Zab) and 4 B (study pockets).
//
// SHAPE. Laptop / tablet (>= 768px): a thin bar along the bottom with a Zab
// button and, once opened, the top-level pockets; a pocket opens a 380px side
// panel. Phone: one corner button (48px) opens the pockets as a bottom sheet.
// A row inside the panel chooses its shape by the PANEL'S OWN measured width
// (ResizeObserver -> data-w), never the window's (Siyagah guide G05).
//
// LOAD (I9). Mounting draws a button and reads NOTHING. Pockets are read the
// first time the bar is opened, and seeded once (seedPockets) when the tenant
// has none.
//
// I2/I15. Screen code never touches Firestore directly: every read and write
// goes through zab-data.js, and a failed write shows a message in the panel.
// Nothing is ever deleted: Trash and Restore (I4).
//
// THE WAY BACK. Opening remembers the element that had focus and the scroll
// position; closing puts both back, so the reader is exactly where they were.

import { db, auth } from "./firebase-init.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { getActiveContext, getMyMembershipRoles, pickContext } from "./session-context.js";
import { t } from "./i18n.js";
import { langText } from "./lang.js";
import { getAppLang } from "./prefs.js";
import * as zab from "./zab-data.js";
import * as zabNote from "./zab-to-note.js";

const BAR_H = 44;
// A row keeps its actions beside the text only when the PANEL is this wide (measured, not the window). The 380px
// side panel and a phone are both narrower: the actions take their own line under the text. (Measured: beside the
// text at 380px the text column was squeezed to ~40px.)
const NARROW_BELOW = 560;
const ICONS = ["📁", "🧠", "🔁", "❓", "🔗", "⭐", "📖", "🕌", "✍️", "💡", "🎯", "🛒"];

const S = {
  ctx: null, loaded: false, loading: false,
  pockets: [], items: [], people: null,
  trashed: { pockets: [], items: [] },
  view: "closed", pocketId: null, editingPocket: null, editingItem: null,
  opener: null, scrollY: 0, msg: "", openSteps: new Set(), openTopics: new Set(), ideaSort: "order",
  notePick: null, toast: null,
};
let root = null, ro = null;

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lang = () => getAppLang();
const pocketName = (p) => (p.names ? langText(p.names, lang(), p.name) : p.name || "");
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : v instanceof Date ? v.getTime() : 0);
const activePockets = () => S.pockets.filter((p) => p.status !== "trashed").sort(byOrder);
const pocketById = (id) => S.pockets.find((p) => p.pocketId === id);

const CSS = `
#zabRoot { font: 14px/1.35 system-ui, sans-serif; color: #1b2a41; }
#zabRoot *, #zabRoot *::before, #zabRoot *::after { box-sizing: border-box; }
#zabBar { position: fixed; left: 0; right: 0; bottom: 0; height: ${BAR_H}px; z-index: 900; display: none; align-items: center; gap: 4px; padding: 0 6px; background: #1f3a6e; color: #fff; }
#zabBar .zab-bar-scroll { display: flex; gap: 4px; flex: 1 1 auto; min-width: 0; overflow-x: auto; scrollbar-width: none; }
#zabBar button { min-height: 40px; min-width: 40px; border: 0; border-radius: 8px; background: rgba(255,255,255,.14); color: #fff; font: inherit; padding: 0 12px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
#zabBar button[aria-pressed="true"] { background: #fff; color: #1f3a6e; }
#zabSpacer { display: none; height: ${BAR_H}px; }
#zabCorner { position: fixed; right: 12px; bottom: 12px; width: 48px; height: 48px; border-radius: 50%; border: 0; z-index: 900; background: #1f3a6e; color: #fff; font-size: 22px; box-shadow: 0 2px 10px rgba(0,0,0,.3); cursor: pointer; }
body:has(.nw-switch) #zabCorner { bottom: 68px; }
#zabBackdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 940; }
#zabPanel { position: fixed; z-index: 950; background: #fff; color: #1b2a41; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 -2px 18px rgba(0,0,0,.28); left: 0; right: 0; bottom: 0; max-height: 78vh; border-radius: 16px 16px 0 0; }
#zabPanel[hidden], #zabBackdrop[hidden] { display: none; }
.zab-head { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #dde3ee; min-width: 0; }
.zab-head h2 { flex: 1 1 auto; margin: 0; font-size: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zab-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 8px 10px 14px; }
#zabPanel button, #zabPanel select, #zabPanel input { font: inherit; min-height: 40px; max-width: 100%; }
#zabPanel button { min-width: 40px; border: 1px solid #c7d0e0; border-radius: 8px; background: #f3f6fb; color: #1b2a41; cursor: pointer; padding: 0 10px; }
#zabPanel input[type="text"], #zabPanel select { border: 1px solid #c7d0e0; border-radius: 8px; padding: 0 8px; background: #fff; color: #1b2a41; min-width: 0; }
#zabPanel input[type="color"] { padding: 0 2px; width: 44px; }
#zabPanel input[type="date"] { border: 1px solid #c7d0e0; border-radius: 8px; padding: 0 8px; background: #fff; color: #1b2a41; min-width: 0; flex: 0 1 11rem; }
.zab-add { display: flex; gap: 6px; margin-bottom: 8px; }
.zab-add button { flex: 0 0 auto; white-space: nowrap; } /* Z3 review: a squeezed Add broke into "Ad / d" beside a step box */
.zab-add input { flex: 1 1 auto; }
/* Architect review (Z2, 14 Oct): the item's text gets the full row; its controls sit in one tidy line beneath it, at
   every width. Side by side, the five controls left the text a column a few letters wide (seen in the 380px panel). */
.zab-row { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 8px; row-gap: 4px; align-items: start; padding: 8px 0; border-bottom: 1px solid #eef1f6; min-width: 0; }
.zab-row .zab-main { min-width: 0; overflow-wrap: anywhere; padding-top: 1px; }
.zab-row .zab-by { display: block; font-size: .78rem; color: #5b6b86; }
.zab-row .zab-acts { grid-column: 1 / -1; display: flex; flex-wrap: nowrap; gap: 4px; align-items: center; justify-content: flex-end; min-width: 0; }
.zab-row .zab-acts select { width: auto; flex: 0 1 9.5rem; min-width: 5.5rem; max-width: 9.5rem; min-height: 40px; } /* a page-wide "select { width:100% }" would push the other controls onto lines of their own */
.zab-row.zab-done .zab-text { text-decoration: line-through; color: #6b778c; }
.zab-row input[type="checkbox"] { width: 22px; min-height: 22px; flex: 0 0 auto; }
#zabPanel[data-w="narrow"] .zab-row { flex-wrap: wrap; }
#zabPanel[data-w="narrow"] .zab-row .zab-main { flex: 1 1 calc(100% - 40px); }
#zabPanel[data-w="narrow"] .zab-row .zab-acts { flex: 1 1 100%; }
/* Z3: the kind details sit on ONE quiet line under the text (never beside it). */
.zab-det { display: flex; flex-wrap: nowrap; align-items: center; gap: 8px; min-width: 0; margin-top: 2px; font-size: .82rem; color: #5b6b86; }
.zab-det > * { flex: 0 0 auto; }
.zab-det .zab-site { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.zab-det .zab-link { white-space: nowrap; color: #1f3a6e; }
.zab-pri { color: #8a1c14; font-weight: 600; }
.zab-det button.zab-stepcount { min-height: 32px; min-width: 40px; padding: 0 8px; font-size: .82rem; }
/* Z4: stars are 32px+ to tap; topics wrap on their own line under the details. */
.zab-stars { display: inline-flex; gap: 2px; flex: 0 0 auto; }
#zabPanel .zab-star { min-width: 32px; min-height: 32px; width: 32px; padding: 0; border: 0; background: none; font-size: 1.2rem; line-height: 1; color: #9aa6bd; }
#zabPanel .zab-star[aria-pressed="true"] { color: #c27c0e; }
.zab-topics { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; align-items: center; }
.zab-topic { display: inline-flex; align-items: center; gap: 2px; padding-inline-start: 8px; border-radius: 999px; background: #e8eefa; font-size: .8rem; max-width: 100%; }
.zab-topic span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#zabPanel .zab-topic button { min-height: 32px; min-width: 32px; padding: 0; border: 0; background: none; }
/* Z5: → Note. The controls stay on ONE line: below 420px the Move-to select gives up width, never a line. */
@media (max-width: 420px) { .zab-row .zab-acts select { flex-basis: 4rem; min-width: 4rem; } .zab-row .zab-acts { gap: 2px; } }
.zab-pick { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; border-radius: 8px; background: #eef3fb; }
.zab-pick label { flex: 1 0 100%; font-size: .85rem; color: #1f3a6e; }
.zab-pick select { flex: 1 1 10rem; min-width: 0; }
#zabToast { position: fixed; left: 12px; right: 12px; bottom: 72px; z-index: 960; display: flex; gap: 8px; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: #1b2a41; color: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.35); font: 14px/1.35 system-ui, sans-serif; }
#zabToast[hidden] { display: none; }
#zabToast a { color: #fff; font-weight: 600; text-decoration: underline; padding: 10px 6px; }
#zabToast button { min-height: 40px; min-width: 40px; border: 0; border-radius: 8px; background: rgba(255,255,255,.16); color: #fff; font: inherit; cursor: pointer; }
.zab-sort { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
.zab-sort select { flex: 0 1 12rem; }
.zab-qty { font-weight: 600; color: #1b2a41; }
.zab-group h3 { margin: 10px 0 0; font-size: .85rem; color: #1f3a6e; text-transform: none; }
.zab-steps { margin-top: 4px; }
.zab-step { display: flex; align-items: center; gap: 8px; min-height: 32px; min-width: 0; overflow-wrap: anywhere; }
.zab-step input[type="checkbox"] { width: 20px; min-height: 20px; flex: 0 0 auto; }
.zab-step-done span { text-decoration: line-through; color: #6b778c; }
.zab-steps .zab-add { margin: 4px 0 0; }
.zab-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-inline-end: 6px; }
.zab-edit { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
.zab-edit input[type="text"] { flex: 1 1 140px; }
#zabMsg { margin: 0 0 8px; padding: 6px 8px; border-radius: 8px; background: #fdecea; color: #8a1c14; }
#zabMsg:empty { display: none; }
.zab-muted { color: #5b6b86; }
.zab-foot { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
@media (min-width: 768px) {
  #zabBar { display: flex; }
  #zabSpacer { display: block; }
  #zabCorner { display: none; }
  #zabBackdrop { display: none; }
  #zabToast { left: auto; right: 12px; width: 380px; max-width: calc(100vw - 24px); bottom: ${BAR_H + 12}px; }
  #zabPanel { left: auto; right: 0; top: 0; bottom: ${BAR_H}px; width: 380px; max-width: 100vw; max-height: none; border-radius: 0; box-shadow: -2px 0 18px rgba(0,0,0,.22); }
  body.zab-bar-on .nw-switch { bottom: ${BAR_H}px; }
  body.zab-bar-on #swUpdateNotice { bottom: calc(1rem + ${BAR_H}px) !important; }
  body.zab-bar-on .aa-toast { bottom: calc(24px + ${BAR_H}px); }
  body.zab-bar-on #qrStudyNotice { bottom: calc(4.6rem + ${BAR_H}px); }
  body.zab-bar-on .ayah-sheet { bottom: ${BAR_H}px; }
}
`;

// ---------- mount -----------------------------------------------------------

export function mountZabBar() {
  if (root || typeof document === "undefined") return;
  const start = () => {
    if (root) return;
    const style = document.createElement("style");
    style.id = "zabStyle";
    style.textContent = CSS;
    document.head.appendChild(style);
    root = document.createElement("div");
    root.id = "zabRoot";
    root.setAttribute("data-zab", "");
    root.innerHTML = `<div id="zabSpacer" aria-hidden="true"></div>
      <nav id="zabBar" aria-label="${esc(t("Zab"))}"><button type="button" data-zab-open aria-pressed="false">🧰 ${esc(t("Zab"))}</button><div class="zab-bar-scroll" data-zab-barpockets></div></nav>
      <button type="button" id="zabCorner" data-zab-open aria-label="${esc(t("Open Zab"))}">🧰</button>
      <div id="zabBackdrop" data-zab-close hidden></div>
      <aside id="zabPanel" role="dialog" aria-label="${esc(t("Zab"))}" hidden data-w="wide"></aside>
      <div id="zabToast" role="status" hidden></div>`;
    document.body.appendChild(root);
    document.body.classList.add("zab-bar-on");
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKey);
    root.addEventListener("change", onChange);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.view !== "closed") closePanel(); });
    const panel = root.querySelector("#zabPanel");
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => { panel.dataset.w = panel.clientWidth && panel.clientWidth < NARROW_BELOW ? "narrow" : "wide"; });
      ro.observe(panel);
    }
    resumeAfterNote();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

// ---------- loading (only when first opened) ---------------------------------

async function resolveCtx() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  let c = getActiveContext();
  if (!c) c = pickContext(await getMyMembershipRoles(db, uid), null);
  if (!c?.tenantId || !c?.personId) return null;
  return { tenantId: c.tenantId, personId: c.personId, uid };
}

async function ensureLoaded() {
  if (S.loaded || S.loading) return;
  S.loading = true;
  try {
    S.ctx = await resolveCtx();
    if (!S.ctx) { S.msg = t("Sign in to use Zab."); return; }
    let all = await zab.listPockets(db, S.ctx.tenantId, { includeTrashed: true });
    if (!all.length) {
      const res = await zab.seedPockets(db, S.ctx);
      if (!res.ok) { S.msg = failText(res); return; }
      all = await zab.listPockets(db, S.ctx.tenantId, { includeTrashed: true });
    }
    S.pockets = all;
    S.loaded = true;
  } catch (err) {
    S.msg = t("Could not load Zab. Please try again.");
    console.warn("Zab load failed:", err && err.message);
  } finally {
    S.loading = false;
  }
}

async function ensurePeople() {
  if (S.people || !S.ctx) return;
  S.people = {};
  try {
    const snap = await getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", S.ctx.tenantId)));
    snap.docs.forEach((d) => { const v = d.data(); S.people[v.personId ?? d.id] = v; });
  } catch (err) { console.warn("Zab people load failed:", err && err.message); }
}
const personName = (id) => (S.people?.[id] ? langText(S.people[id].name, lang(), id) : "");

async function loadItems(pocketId) {
  S.items = (await zab.listItems(db, S.ctx.tenantId, pocketId)).sort(byOrder);
}

// ---------- open / close ------------------------------------------------------

async function openPanel(view = "list", pocketId = null) {
  if (S.view === "closed") { S.opener = document.activeElement; S.scrollY = window.scrollY; }
  S.view = "list";
  S.msg = "";
  panel().hidden = false;
  root.querySelector("#zabBackdrop").hidden = false;
  render();
  await ensureLoaded();
  if (S.loaded && pocketId) await openPocket(pocketId);
  else if (S.loaded && view === "trash") await openTrash();
  else render();
}

function closePanel() {
  S.view = "closed"; S.editingPocket = null; S.editingItem = null; S.msg = "";
  panel().hidden = true;
  root.querySelector("#zabBackdrop").hidden = true;
  root.querySelectorAll("[data-zab-open]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  // The way back: focus and scroll return to exactly where the reader was.
  const o = S.opener; S.opener = null;
  if (o && typeof o.focus === "function" && document.contains(o)) { try { o.focus({ preventScroll: true }); } catch { /* ignore */ } }
  window.scrollTo(window.scrollX, S.scrollY);
}

async function openPocket(pocketId) {
  S.view = "pocket"; S.pocketId = pocketId; S.editingItem = null; S.msg = "";
  render();
  try { await Promise.all([loadItems(pocketId), ensurePeople()]); } catch { S.msg = t("Could not load Zab. Please try again."); }
  render();
}

async function openTrash() {
  S.view = "trash"; S.msg = "";
  render();
  try {
    const lists = await Promise.all(S.pockets.map((p) => zab.listItems(db, S.ctx.tenantId, p.pocketId, { includeTrashed: true })));
    S.trashed.items = lists.flat().filter((i) => i.status === "trashed");
    await ensurePeople();
  } catch { S.msg = t("Could not load Zab. Please try again."); }
  render();
}

// ---------- rendering --------------------------------------------------------

const panel = () => root.querySelector("#zabPanel");
const failText = (res) => {
  if (res && res.refused === "not-empty") return t("This pocket still has items. Move or trash them first.");
  if (res && res.refused === "name-required") return t("Please type a name.");
  if (res && res.refused === "text-required") return t("Please type something.");
  return t("Could not save. Please try again.");
};

function renderBarPockets() {
  const host = root.querySelector("[data-zab-barpockets]");
  host.innerHTML = activePockets().map((p) =>
    `<button type="button" data-zab-pocket="${esc(p.pocketId)}" aria-pressed="${S.view === "pocket" && S.pocketId === p.pocketId}">${esc(p.icon || "📁")} ${esc(pocketName(p))}</button>`).join("");
}

function head(title, back) {
  return `<div class="zab-head">${back ? `<button type="button" data-zab-nav="list" aria-label="${esc(t("Back"))}">←</button>` : ""}<h2>${esc(title)}</h2><button type="button" data-zab-close aria-label="${esc(t("Close"))}">✕</button></div>`;
}
const msgBox = () => `<p id="zabMsg" role="status">${esc(S.msg)}</p>`;

const KIND_NAMES = { plain: "Plain", tasks: "Tasks", links: "Links", ideas: "Ideas", shop: "Shopping" };
const KIND_PICKS = ["plain", "tasks", "links", "ideas", "shop"];

function renderList() {
  const ps = activePockets();
  const rows = ps.map((p, i) => {
    if (S.editingPocket === p.pocketId) {
      return `<div class="zab-row"><div class="zab-edit" data-zab-edit-pocket="${esc(p.pocketId)}">
        <input type="text" data-zab-f="name" value="${esc(pocketName(p))}" aria-label="${esc(t("Name"))}">
        <select data-zab-f="icon" aria-label="${esc(t("Icon"))}">${[...new Set([p.icon || "📁", ...ICONS])].map((ic) => `<option${ic === (p.icon || "📁") ? " selected" : ""}>${ic}</option>`).join("")}</select>
        <input type="color" data-zab-f="color" value="${esc(p.color || "#4a5568")}" aria-label="${esc(t("Pocket colour"))}">
        <select data-zab-f="ztype" aria-label="${esc(t("Kind"))}">${KIND_PICKS.map((k) => `<option value="${k}"${k === zab.zabType(p) ? " selected" : ""}>${esc(t(KIND_NAMES[k]))}</option>`).join("")}</select>
        <button type="button" data-zab-save-pocket="${esc(p.pocketId)}">${esc(t("Save"))}</button>
        <button type="button" data-zab-cancel-edit>${esc(t("Cancel"))}</button></div></div>`;
    }
    return `<div class="zab-row"><div class="zab-main"><button type="button" data-zab-pocket="${esc(p.pocketId)}" style="border:0;background:none;padding:0;text-align:start;min-height:40px"><span class="zab-dot" style="background:${esc(p.color || "#4a5568")}"></span>${esc(p.icon || "📁")} ${esc(pocketName(p))}</button></div>
      <div class="zab-acts">
        <button type="button" data-zab-pup="${esc(p.pocketId)}" aria-label="${esc(t("Move up"))}"${i === 0 ? " disabled" : ""}>↑</button>
        <button type="button" data-zab-pdown="${esc(p.pocketId)}" aria-label="${esc(t("Move down"))}"${i === ps.length - 1 ? " disabled" : ""}>↓</button>
        <button type="button" data-zab-pedit="${esc(p.pocketId)}" aria-label="${esc(t("Rename"))}">✎</button>
        <button type="button" data-zab-ptrash="${esc(p.pocketId)}" aria-label="${esc(t("Trash"))}">🗑</button></div></div>`;
  }).join("");
  return `${head(t("Zab"))}<div class="zab-body">${msgBox()}
    <div class="zab-add"><input type="text" data-zab-new-pocket placeholder="${esc(t("New pocket name"))}" aria-label="${esc(t("New pocket name"))}"><button type="button" data-zab-add-pocket>${esc(t("Add pocket"))}</button></div>
    ${S.loading ? `<p class="zab-muted">${esc(t("Loading…"))}</p>` : rows || `<p class="zab-muted">${esc(t("Nothing here yet."))}</p>`}
    <div class="zab-foot"><button type="button" data-zab-nav="trash">🗑 ${esc(t("Trash"))}</button></div></div>`;
}

const GROUP_NAMES = { overdue: "Overdue", today: "Today", tomorrow: "Tomorrow", later: "Later", nodate: "No date", done: "Done" };

function itemControls(it, i, n, others) {
  return `<div class="zab-acts">
        <button type="button" data-zab-iup="${esc(it.itemId)}" aria-label="${esc(t("Move up"))}"${i === 0 ? " disabled" : ""}>↑</button>
        <button type="button" data-zab-idown="${esc(it.itemId)}" aria-label="${esc(t("Move down"))}"${i === n - 1 ? " disabled" : ""}>↓</button>
        <button type="button" data-zab-iedit="${esc(it.itemId)}" aria-label="${esc(t("Edit"))}">✎</button>
        <button type="button" data-zab-tonote="${esc(it.itemId)}" aria-label="${esc(t("Save as a Note"))}" title="${esc(t("Save as a Note"))}">→📝</button>
        ${others.length ? `<select data-zab-imove="${esc(it.itemId)}" aria-label="${esc(t("Move to…"))}"><option value="">${esc(t("Move to…"))}</option>${others.map((o) => `<option value="${esc(o.pocketId)}">${esc(pocketName(o))}</option>`).join("")}</select>` : ""}
        <button type="button" data-zab-itrash="${esc(it.itemId)}" aria-label="${esc(t("Trash"))}">🗑</button></div>`;
}

/** The quiet line under an item's text. Drawn from the POCKET's kind only: the item keeps every field it has. */
function kindDetails(it, kind) {
  if (kind === "tasks") {
    const sc = zab.stepCount(it.steps);
    const bits = [];
    if (it.pri === 1) bits.push(`<span class="zab-pri" data-zab-pri title="${esc(t("High priority"))}">❗ ${esc(t("High"))}</span>`);
    if (zab.isDay(it.due)) bits.push(`<span class="zab-due" data-zab-due>${esc(it.due)}</span>`);
    bits.push(`<button type="button" class="zab-stepcount" data-zab-steps="${esc(it.itemId)}" aria-expanded="${S.openSteps.has(it.itemId)}" aria-label="${esc(t("Steps"))}">${sc.total ? `${sc.done}/${sc.total}` : "＋"}</button>`);
    return `<div class="zab-det">${bits.join("")}</div>`;
  }
  if (kind === "ideas") {
    const stars = [1, 2, 3].map((n) => `<button type="button" class="zab-star" data-zab-star="${esc(it.itemId)}:${n}" aria-pressed="${it.stars >= n}" aria-label="${esc(t("{n} star", { n }))}">${it.stars >= n ? "★" : "☆"}</button>`).join("");
    return `<div class="zab-det"><span class="zab-stars" role="group" aria-label="${esc(t("Stars"))}">${stars}</span><button type="button" class="zab-stepcount" data-zab-topics="${esc(it.itemId)}" aria-expanded="${S.openTopics.has(it.itemId)}" aria-label="${esc(t("Topics"))}">＋ ${esc(t("Topics"))}</button></div>${topicsBlock(it)}`;
  }
  if (kind === "shop" && (it.qty || it.shop)) {
    return `<div class="zab-det">${it.qty ? `<span class="zab-qty" data-zab-qty>× ${esc(it.qty)}</span>` : ""}${it.shop ? `<span class="zab-site" data-zab-shop>🛒 ${esc(it.shop)}</span>` : ""}</div>`;
  }
  if (kind === "links" && it.url) {
    return `<div class="zab-det"><span class="zab-site">${esc(zab.siteName(it.url))}</span><a class="zab-link" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(t("Open link"))} ↗</a></div>`;
  }
  return "";
}

function topicsBlock(it) {
  const chips = (it.topics || []).map((x) => `<span class="zab-topic" data-zab-topic><span>${esc(x)}</span><button type="button" data-zab-rm-topic="${esc(it.itemId)}:${esc(x)}" aria-label="${esc(t("Remove topic {name}", { name: x }))}">✕</button></span>`).join("");
  const add = S.openTopics.has(it.itemId)
    ? `<div class="zab-add" style="width:100%;margin:0"><input type="text" data-zab-new-topic="${esc(it.itemId)}" placeholder="${esc(t("Add a topic"))}" aria-label="${esc(t("Add a topic"))}"><button type="button" data-zab-add-topic="${esc(it.itemId)}">${esc(t("Add"))}</button></div>` : "";
  return chips || add ? `<div class="zab-topics">${chips}${add}</div>` : "";
}

function stepsBlock(it) {
  if (!S.openSteps.has(it.itemId)) return "";
  const rows = (it.steps || []).map((s) => `<label class="zab-step${s.d ? " zab-step-done" : ""}"><input type="checkbox" data-zab-step="${esc(it.itemId)}:${esc(s.id)}"${s.d ? " checked" : ""} aria-label="${esc(t("Tick as done"))}"><span>${esc(s.t)}</span></label>`).join("");
  return `<div class="zab-steps">${rows}<div class="zab-add"><input type="text" data-zab-new-step="${esc(it.itemId)}" placeholder="${esc(t("Add a step"))}" aria-label="${esc(t("Add a step"))}"><button type="button" data-zab-add-step="${esc(it.itemId)}">${esc(t("Add"))}</button></div></div>`;
}

function itemEditForm(it, kind) {
  const extra = kind === "tasks"
    ? `<input type="date" data-zab-item-due value="${esc(zab.isDay(it.due) ? it.due : "")}" aria-label="${esc(t("Due date"))}">
       <select data-zab-item-pri aria-label="${esc(t("Priority"))}"><option value="">${esc(t("Normal"))}</option><option value="1"${it.pri === 1 ? " selected" : ""}>${esc(t("High"))}</option></select>`
    : kind === "links"
      ? `<input type="text" data-zab-item-url value="${esc(it.url || "")}" placeholder="https://" aria-label="${esc(t("Link"))}">`
      : kind === "shop"
        ? `<input type="text" data-zab-item-qty value="${esc(it.qty || "")}" placeholder="${esc(t("Quantity"))}" aria-label="${esc(t("Quantity"))}" style="flex:0 1 6rem">
           <input type="text" data-zab-item-shop value="${esc(it.shop || "")}" placeholder="${esc(t("Shop"))}" aria-label="${esc(t("Shop"))}">`
        : "";
  return `<div class="zab-edit"><input type="text" data-zab-item-text value="${esc(it.text)}" aria-label="${esc(t("Edit"))}">${extra}<button type="button" data-zab-save-item="${esc(it.itemId)}">${esc(t("Save"))}</button><button type="button" data-zab-cancel-edit>${esc(t("Cancel"))}</button></div>`;
}

/** The small folder picker under a row: the reader's Mapping My Journey folders, "No folder" allowed (G05's 📎, one choice). */
function notePickBlock(it) {
  const np = S.notePick;
  if (!np || np.itemId !== it.itemId) return "";
  if (!np.folders) return `<div class="zab-pick zab-muted" data-zab-pick>${esc(t("Loading…"))}</div>`;
  return `<div class="zab-pick" data-zab-pick><label for="zabNoteFolder">${esc(t("File the Note in"))}</label>
    <select id="zabNoteFolder" data-zab-note-folder><option value="">${esc(t("No folder"))}</option>${np.folders.map((f) => `<option value="${esc(f.folderId)}">${esc(f.name)}</option>`).join("")}</select>
    <button type="button" data-zab-note-go="${esc(it.itemId)}">${esc(t("Save as a Note"))}</button>
    <button type="button" data-zab-note-cancel>${esc(t("Cancel"))}</button></div>`;
}

function itemRow(it, i, n, others, kind) {
  const by = personName(it.addedByPersonId);
  const main = S.editingItem === it.itemId
    ? itemEditForm(it, kind)
    : `<span class="zab-text">${esc(it.text)}</span>${by ? `<span class="zab-by">${esc(t("Added by {name}", { name: by }))}</span>` : ""}${kindDetails(it, kind)}${kind === "tasks" ? stepsBlock(it) : ""}`;
  return `<div class="zab-row${it.done ? " zab-done" : ""}" data-zab-item="${esc(it.itemId)}">
      <input type="checkbox" data-zab-tick="${esc(it.itemId)}"${it.done ? " checked" : ""} aria-label="${esc(t("Tick as done"))}">
      <div class="zab-main">${main}</div>
      ${itemControls(it, i, n, others)}${notePickBlock(it)}</div>`;
}

/** Tasks are shown under headings; reordering stays inside a heading. */
function taskGroups() {
  const now = new Date();
  const g = {};
  for (const name of zab.TASK_GROUPS) g[name] = [];
  for (const it of S.items.slice().sort(byOrder)) g[zab.dueGroup(it, now)].push(it);
  return g;
}

function renderPocket() {
  const p = pocketById(S.pocketId);
  const kind = zab.zabType(p);
  const others = activePockets().filter((x) => x.pocketId !== S.pocketId);
  let rows;
  if (kind === "tasks") {
    const g = taskGroups();
    rows = zab.TASK_GROUPS.filter((name) => g[name].length).map((name) =>
      `<section class="zab-group" data-zab-group="${name}"><h3>${esc(t(GROUP_NAMES[name]))} <span class="zab-muted">${g[name].length}</span></h3>${g[name].map((it, i) => itemRow(it, i, g[name].length, others, kind)).join("")}</section>`).join("");
  } else if (kind === "shop") {
    rows = zab.shopGroups(S.items).map((g) =>
      `<section class="zab-group" data-zab-group="${g.done ? "done" : g.key ? "shop" : "noshop"}"${g.key && !g.done ? ` data-zab-shopname="${esc(g.key)}"` : ""}><h3>${esc(g.done ? t("Done") : g.key || t("No shop"))} <span class="zab-muted">${g.items.length}</span></h3>${g.items.map((it, i) => itemRow(it, i, g.items.length, others, kind)).join("")}</section>`).join("");
  } else if (kind === "ideas") {
    const list = S.ideaSort === "stars" ? zab.sortByStars(S.items) : S.items;
    const sorter = `<div class="zab-sort"><label for="zabIdeaSort">${esc(t("Sort"))}</label><select id="zabIdeaSort" data-zab-idea-sort><option value="order"${S.ideaSort === "order" ? " selected" : ""}>${esc(t("By order"))}</option><option value="stars"${S.ideaSort === "stars" ? " selected" : ""}>${esc(t("By stars"))}</option></select></div>`;
    rows = sorter + list.map((it, i) => itemRow(it, i, list.length, others, kind)).join("");
  } else {
    rows = S.items.map((it, i) => itemRow(it, i, S.items.length, others, kind)).join("");
  }
  const hint = kind === "shop" ? t("Add an item — try 2 milk @Coles") : kind === "ideas" ? t("Add an idea") : kind === "tasks" ? t("Add a task — ! for high priority, today or tomorrow") : kind === "links" ? t("Paste a link or type a note") : t("Add an item and press Enter");
  return `${head(`${p?.icon || "📁"} ${p ? pocketName(p) : ""}`, true)}<div class="zab-body" data-zab-kind="${kind}">${msgBox()}
    <div class="zab-add"><input type="text" data-zab-new-item placeholder="${esc(hint)}" aria-label="${esc(hint)}"><button type="button" data-zab-add-item>${esc(t("Add"))}</button></div>
    ${rows || `<p class="zab-muted">${esc(t("Nothing here yet."))}</p>`}
    <div class="zab-foot"><button type="button" data-zab-clear-done>${esc(t("Clear done"))}</button></div></div>`;
}

function renderTrash() {
  const tp = S.pockets.filter((p) => p.status === "trashed").map((p) => ({ kind: "pocket", id: p.pocketId, label: `${p.icon || "📁"} ${pocketName(p)}`, at: ms(p.deletedAt) }));
  const ti = S.trashed.items.map((i) => ({ kind: "item", id: i.itemId, label: i.text, at: ms(i.deletedAt), by: personName(i.addedByPersonId), noteId: typeof i.noteId === "string" ? i.noteId : "" }));
  const all = [...tp, ...ti].sort((a, b) => b.at - a.at);
  const rows = all.map((r) => `<div class="zab-row"><div class="zab-main"><span class="zab-text">${esc(r.label)}</span>${r.by ? `<span class="zab-by">${esc(t("Added by {name}", { name: r.by }))}</span>` : ""}${r.noteId ? `<span class="zab-by" data-zab-became>${esc(t("Became a Note"))} · <a href="${esc(zabNote.noteHref(r.noteId))}" data-zab-note-open="${esc(r.noteId)}">${esc(t("Open"))}</a></span>` : ""}</div>
    <div class="zab-acts"><button type="button" data-zab-restore="${r.kind}:${esc(r.id)}">${esc(t("Restore"))}</button></div></div>`).join("");
  return `${head(t("Trash"), true)}<div class="zab-body">${msgBox()}${rows || `<p class="zab-muted">${esc(t("Trash is empty."))}</p>`}</div>`;
}

function render() {
  if (!root) return;
  renderBarPockets();
  root.querySelectorAll("[data-zab-open]").forEach((b) => b.setAttribute("aria-pressed", String(S.view !== "closed")));
  if (S.view === "closed") return;
  const p = panel();
  const keep = p.querySelector("input[data-zab-new-pocket],input[data-zab-new-item]");
  const typed = keep ? keep.value : "";
  const hadFocus = keep && document.activeElement === keep;
  p.innerHTML = S.view === "pocket" ? renderPocket() : S.view === "trash" ? renderTrash() : renderList();
  if (typed) { const k = p.querySelector("input[data-zab-new-pocket],input[data-zab-new-item]"); if (k) { k.value = typed; if (hadFocus) k.focus(); } }
  p.dataset.w = p.clientWidth && p.clientWidth < NARROW_BELOW ? "narrow" : "wide";
}

// ---------- actions ------------------------------------------------------------

async function run(fn, onOk) {
  S.msg = "";
  let res;
  try { res = await fn(); } catch (err) { res = { ok: false }; console.warn("Zab action failed:", err && err.message); }
  if (!res || res.ok === false) { S.msg = failText(res); render(); return false; }
  if (onOk) await onOk(res);
  render();
  return true;
}

const itemById = (id) => S.items.find((i) => i.itemId === id);
/** The list an item reorders within: its heading's items in a Tasks pocket, the whole pocket otherwise. */
function itemNeighbours(id) {
  const kind = zab.zabType(pocketById(S.pocketId));
  if (kind === "shop") return zab.shopGroups(S.items).map((g) => g.items).find((l) => l.some((i) => i.itemId === id)) || S.items;
  if (kind === "ideas" && S.ideaSort === "stars") return zab.sortByStars(S.items);
  if (kind !== "tasks") return S.items;
  const g = taskGroups();
  return zab.TASK_GROUPS.map((n) => g[n]).find((l) => l.some((i) => i.itemId === id)) || S.items;
}

async function swapOrder(list, id, dir, idKey, edit) {
  const i = list.findIndex((x) => x[idKey] === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const a = list[i], b = list[j];
  const ao = a.order ?? i, bo = b.order ?? j;
  const [r1, r2] = [await edit(a[idKey], { order: bo }), await edit(b[idKey], { order: ao })];
  if (!r1.ok || !r2.ok) { S.msg = failText(!r1.ok ? r1 : r2); render(); return; }
  a.order = bo; b.order = ao;
  list.sort(byOrder);
  render();
}

async function onClick(e) {
  const el = e.target instanceof Element ? e.target : null;
  if (!el) return;
  const q = (sel) => el.closest(sel);
  const noteLink = q("[data-zab-note-open]");
  if (noteLink) {
    // A full-page visit, not the Mapping My Journey pop-up tray (journey-tray.js would otherwise catch this link):
    // the Note opens with back=1, and ← Back returns here with Zab open on this pocket.
    if (e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab: the link's own behaviour
    e.preventDefault(); rememberWayBack();
    location.href = noteLink.href;
    return;
  }
  const c = S.ctx;
  let h;
  if (q("[data-zab-close]")) return closePanel();
  if ((h = q("[data-zab-open]"))) return S.view === "closed" ? openPanel("list") : closePanel();
  if ((h = q("[data-zab-pocket]"))) {
    if (S.view === "closed") return openPanel("list", h.dataset.zabPocket);
    return openPocket(h.dataset.zabPocket);
  }
  if (!c) return;
  if ((h = q("[data-zab-nav]"))) { return h.dataset.zabNav === "trash" ? openTrash() : (S.view = "list", S.msg = "", S.editingPocket = null, render()); }
  if (q("[data-zab-cancel-edit]")) { S.editingPocket = null; S.editingItem = null; return render(); }
  // ---- pockets
  if (q("[data-zab-add-pocket]")) return addPocketFromInput();
  if ((h = q("[data-zab-pedit]"))) { S.editingPocket = h.dataset.zabPedit; return render(); }
  if ((h = q("[data-zab-save-pocket]"))) return savePocket(h.dataset.zabSavePocket);
  if ((h = q("[data-zab-pup]"))) return swapOrder(activePockets(), h.dataset.zabPup, -1, "pocketId", (id, patch) => zab.editPocket(db, c, id, patch));
  if ((h = q("[data-zab-pdown]"))) return swapOrder(activePockets(), h.dataset.zabPdown, 1, "pocketId", (id, patch) => zab.editPocket(db, c, id, patch));
  if ((h = q("[data-zab-ptrash]"))) {
    const id = h.dataset.zabPtrash;
    return run(() => zab.trashPocket(db, c, id), () => { const p = pocketById(id); if (p) { p.status = "trashed"; p.deletedAt = new Date(); } });
  }
  // ---- items
  if (q("[data-zab-add-item]")) return addItemFromInput();
  if ((h = q("[data-zab-iedit]"))) { S.editingItem = h.dataset.zabIedit; render(); const f = panel().querySelector("[data-zab-item-text]"); if (f) f.focus(); return; }
  if ((h = q("[data-zab-save-item]"))) return saveItem(h.dataset.zabSaveItem);
  if ((h = q("[data-zab-iup]"))) return swapOrder(itemNeighbours(h.dataset.zabIup), h.dataset.zabIup, -1, "itemId", (id, patch) => zab.editItem(db, c, id, patch));
  if ((h = q("[data-zab-idown]"))) return swapOrder(itemNeighbours(h.dataset.zabIdown), h.dataset.zabIdown, 1, "itemId", (id, patch) => zab.editItem(db, c, id, patch));
  if ((h = q("[data-zab-steps]"))) { const id = h.dataset.zabSteps; if (S.openSteps.has(id)) S.openSteps.delete(id); else S.openSteps.add(id); return render(); }
  if ((h = q("[data-zab-add-step]"))) return addStepFromInput(h.dataset.zabAddStep);
  if ((h = q("[data-zab-star]"))) {
    const [id, n] = h.dataset.zabStar.split(":"), it = itemById(id);
    if (!it) return;
    const next = zab.nextStars(it.stars, n);
    return run(() => zab.editItem(db, c, id, { stars: next }), () => { if (next) it.stars = next; else delete it.stars; });
  }
  if ((h = q("[data-zab-topics]"))) { const id = h.dataset.zabTopics; if (S.openTopics.has(id)) S.openTopics.delete(id); else S.openTopics.add(id); render(); const f = panel().querySelector(`[data-zab-new-topic="${CSS_ESC(id)}"]`); if (f) f.focus(); return; }
  if ((h = q("[data-zab-add-topic]"))) return addTopicFromInput(h.dataset.zabAddTopic);
  if ((h = q("[data-zab-rm-topic]"))) {
    const [id, name] = h.dataset.zabRmTopic.split(/:(.*)/s), it = itemById(id);
    if (!it) return;
    const topics = zab.removeTopic(it.topics, name);
    return run(() => zab.editItem(db, c, id, { topics }), () => { if (topics.length) it.topics = topics; else delete it.topics; });
  }
  if ((h = q("[data-zab-tonote]"))) return startToNote(h.dataset.zabTonote);
  if (q("[data-zab-note-cancel]")) { S.notePick = null; return render(); }
  if ((h = q("[data-zab-note-go]"))) {
    const sel = panel().querySelector("[data-zab-note-folder]");
    return finishToNote(h.dataset.zabNoteGo, sel && sel.value ? [sel.value] : []);
  }
  if (q("[data-zab-toast-close]")) return hideToast();
  if ((h = q("[data-zab-itrash]"))) {
    const id = h.dataset.zabItrash;
    return run(() => zab.trashItem(db, c, id), () => { S.items = S.items.filter((i) => i.itemId !== id); });
  }
  if (q("[data-zab-clear-done]")) {
    const pid = S.pocketId;
    return run(() => zab.clearDone(db, c, pid), () => { S.items = S.items.filter((i) => i.done !== true); });
  }
  // ---- trash
  if ((h = q("[data-zab-restore]"))) {
    const [kind, id] = h.dataset.zabRestore.split(/:(.*)/s);
    if (kind === "pocket") return run(() => zab.restorePocket(db, c, id), () => { const p = pocketById(id); if (p) { p.status = "active"; delete p.deletedAt; } });
    return run(() => zab.restoreItem(db, c, id), () => { S.trashed.items = S.trashed.items.filter((i) => i.itemId !== id); });
  }
}

// ---------- → Note (Z5) ---------------------------------------------------------------------

/** The way back (decision 86): the history entry we leave carries the pocket, so ← Back reopens Zab on it. */
function rememberWayBack() {
  try { history.replaceState({ ...(history.state || {}), zabPocket: S.pocketId || null, zabWasOpen: true }, ""); } catch { /* ignore */ }
}

/** After ← Back: if this history entry says Zab was open on a pocket, open it there again. */
async function resumeAfterNote() {
  const st = history.state;
  if (!st || !st.zabWasOpen) return;
  try { await auth.authStateReady?.(); } catch { /* ignore */ }
  try { history.replaceState({ ...st, zabWasOpen: false }, ""); } catch { /* ignore */ }
  openPanel("list", st.zabPocket || null);
}

function showToast(noteId) {
  S.toast = { noteId };
  const el = root.querySelector("#zabToast");
  el.innerHTML = `<span>${esc(t("Saved as a Note"))}</span><a href="${esc(zabNote.noteHref(noteId))}" data-zab-note-open="${esc(noteId)}">${esc(t("Open"))}</a><button type="button" data-zab-toast-close aria-label="${esc(t("Close"))}">✕</button>`;
  el.hidden = false;
}
function hideToast() {
  S.toast = null;
  const el = root.querySelector("#zabToast");
  el.hidden = true; el.innerHTML = "";
}

/** → Note pressed: if the item already names folders that exist, file there; otherwise ask once. */
async function startToNote(itemId) {
  const it = itemById(itemId);
  if (!it || !S.ctx) return;
  S.msg = ""; S.notePick = { itemId, folders: null };
  render();
  let folders;
  try { folders = await zabNote.listFoldersForPicker(db, S.ctx); } catch (err) {
    console.warn("Zab folders load failed:", err && err.message);
    S.notePick = null; S.msg = t("Could not load your folders. Please try again."); return render();
  }
  const own = (Array.isArray(it.folderIds) ? it.folderIds : []).filter((id) => folders.some((f) => f.folderId === id));
  if (own.length) return finishToNote(itemId, own);
  S.notePick = { itemId, folders };
  render();
}

async function finishToNote(itemId, folderIds) {
  const it = itemById(itemId);
  if (!it || !S.ctx) return;
  S.notePick = null; S.msg = "";
  const res = await zabNote.itemToNote(db, S.ctx, it, folderIds);
  if (!res.ok) {
    S.msg = res.stage === "note" ? t("Could not save the Note. The item is unchanged.")
      : res.stage === "filing" ? t("The Note was saved, but filing it in the folder failed. The item is still here.")
        : t("The Note was saved, but the item could not be moved to Trash. It is still here.");
    return render();
  }
  S.items = S.items.filter((i) => i.itemId !== itemId);
  render();
  showToast(res.noteId);
}

async function onChange(e) {
  const el = e.target instanceof Element ? e.target : null;
  if (!el || !S.ctx) return;
  const c = S.ctx;
  if (el.matches("[data-zab-tick]")) {
    const id = el.dataset.zabTick, done = el.checked;
    return run(() => zab.toggleDone(db, c, id, done), () => { const it = itemById(id); if (it) it.done = done; });
  }
  if (el.matches("[data-zab-step]")) {
    const [id, stepId] = el.dataset.zabStep.split(/:(.*)/s);
    const it = itemById(id);
    if (!it) return;
    const steps = zab.toggleStep(it.steps, stepId);
    return run(() => zab.editItem(db, c, id, { steps }), () => { it.steps = steps; });
  }
  if (el.matches("[data-zab-idea-sort]")) { S.ideaSort = el.value === "stars" ? "stars" : "order"; return render(); }
  if (el.matches("[data-zab-imove]") && el.value) {
    const id = el.dataset.zabImove, to = el.value;
    return run(() => zab.moveItem(db, c, id, to), () => { S.items = S.items.filter((i) => i.itemId !== id); });
  }
}

function onKey(e) {
  if (e.key !== "Enter") return;
  const el = e.target instanceof Element ? e.target : null;
  if (!el) return;
  if (el.matches("[data-zab-new-item]")) { e.preventDefault(); addItemFromInput(); }
  else if (el.matches("[data-zab-new-pocket]")) { e.preventDefault(); addPocketFromInput(); }
  else if (el.matches("[data-zab-new-step]")) { e.preventDefault(); addStepFromInput(el.dataset.zabNewStep); }
  else if (el.matches("[data-zab-new-topic]")) { e.preventDefault(); addTopicFromInput(el.dataset.zabNewTopic); }
  else if (el.matches("[data-zab-item-text],[data-zab-item-url],[data-zab-item-qty],[data-zab-item-shop]")) { e.preventDefault(); const b = panel().querySelector("[data-zab-save-item]"); if (b) saveItem(b.dataset.zabSaveItem); }
  else if (el.matches("[data-zab-f='name']")) { e.preventDefault(); const b = panel().querySelector("[data-zab-save-pocket]"); if (b) savePocket(b.dataset.zabSavePocket); }
}

async function addPocketFromInput() {
  const input = panel().querySelector("[data-zab-new-pocket]");
  const name = input ? input.value.trim() : "";
  if (!name) { S.msg = failText({ refused: "name-required" }); return render(); }
  const order = Math.max(0, ...S.pockets.map((p) => p.order ?? 0)) + 1;
  await run(() => zab.addPocket(db, S.ctx, { name, order }), (res) => {
    S.pockets.push({ pocketId: res.pocketId, tenantId: S.ctx.tenantId, addedByPersonId: S.ctx.personId, status: "active", order, name, icon: "📁", color: "#4a5568" });
    if (input) input.value = "";
  });
}

async function savePocket(id) {
  const box = panel().querySelector(`[data-zab-edit-pocket="${CSS_ESC(id)}"]`);
  const p = pocketById(id);
  if (!box || !p) return;
  const name = box.querySelector("[data-zab-f='name']").value.trim();
  const icon = box.querySelector("[data-zab-f='icon']").value;
  const color = box.querySelector("[data-zab-f='color']").value;
  const patch = {};
  if (name !== pocketName(p)) patch.name = name; // a rename writes `name` and removes the seeded `names`
  if (icon !== (p.icon || "📁")) patch.icon = icon;
  if (color !== (p.color || "#4a5568")) patch.color = color;
  const kind = box.querySelector("[data-zab-f='ztype']").value;
  if (kind !== zab.zabType(p)) patch.ztype = kind === "plain" ? "" : kind; // plain = no `ztype` stored (an empty kind field is removed)
  if (!Object.keys(patch).length) { S.editingPocket = null; return render(); }
  await run(() => zab.editPocket(db, S.ctx, id, patch), () => {
    if ("ztype" in patch) { if (patch.ztype) p.ztype = patch.ztype; else delete p.ztype; }
    if (patch.name !== undefined) { p.name = patch.name; delete p.names; }
    if (patch.icon) p.icon = patch.icon;
    if (patch.color) p.color = patch.color;
    S.editingPocket = null;
  });
}

const CSS_ESC = (s) => String(s).replace(/["\\]/g, "\\$&");

async function addItemFromInput() {
  const input = panel().querySelector("[data-zab-new-item]");
  const text = input ? input.value.trim() : "";
  if (!text) { S.msg = failText({ refused: "text-required" }); return render(); }
  const order = Math.max(0, ...S.items.map((i) => i.order ?? 0)) + 1;
  const pocketId = S.pocketId;
  const kind = zab.zabType(pocketById(pocketId));
  // What the kind adds to a new item (nothing for a plain pocket). Empty fields are never sent.
  let fields = { text };
  if (kind === "tasks") fields = zab.parseQuickTask(text);
  else if (kind === "shop") fields = zab.parseQuickShop(text);
  else if (kind === "links" && zab.asUrl(text)) fields = { text: zab.asUrl(text), url: zab.asUrl(text) };
  if (!fields.text) { S.msg = failText({ refused: "text-required" }); return render(); }
  await run(() => zab.addItem(db, S.ctx, pocketId, { ...fields, order }), (res) => {
    S.items.push({ ...fields, itemId: res.itemId, tenantId: S.ctx.tenantId, pocketId, addedByPersonId: S.ctx.personId, status: "active", order, done: false });
    if (input) input.value = "";
  });
  const again = panel().querySelector("[data-zab-new-item]");
  if (again) again.focus();
}

async function saveItem(id) {
  const field = panel().querySelector("[data-zab-item-text]");
  const it = itemById(id);
  if (!field || !it) return;
  const text = field.value.trim();
  const kind = zab.zabType(pocketById(S.pocketId));
  const patch = {};
  if (text !== it.text) patch.text = text;
  if (kind === "tasks") {
    const due = panel().querySelector("[data-zab-item-due]").value;
    const pri = panel().querySelector("[data-zab-item-pri]").value === "1" ? 1 : undefined;
    if ((due || undefined) !== (it.due || undefined)) patch.due = due; // "" removes the field
    if (pri !== (it.pri === 1 ? 1 : undefined)) patch.pri = pri;
  } else if (kind === "shop") {
    const qty = panel().querySelector("[data-zab-item-qty]").value.trim();
    const shop = panel().querySelector("[data-zab-item-shop]").value.trim();
    if (qty !== (it.qty || "")) patch.qty = qty;
    if (shop !== (it.shop || "")) patch.shop = shop;
  } else if (kind === "links") {
    const url = panel().querySelector("[data-zab-item-url]").value.trim();
    if (url && !zab.asUrl(url)) { S.msg = t("Please type a full web address, starting with http."); return render(); }
    if ((url || undefined) !== (it.url || undefined)) patch.url = url;
  }
  if (!Object.keys(patch).length) { S.editingItem = null; return render(); }
  await run(() => zab.editItem(db, S.ctx, id, patch), () => {
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === "") delete it[k]; else it[k] = v; }
    S.editingItem = null;
  });
}

async function addTopicFromInput(itemId) {
  const it = itemById(itemId);
  const input = panel().querySelector(`[data-zab-new-topic="${CSS_ESC(itemId)}"]`);
  if (!it || !input) return;
  const topics = zab.addTopic(it.topics, input.value);
  if (topics.length === (it.topics || []).length) { S.msg = failText({ refused: "text-required" }); return render(); }
  await run(() => zab.editItem(db, S.ctx, itemId, { topics }), () => { it.topics = topics; });
  const again = panel().querySelector(`[data-zab-new-topic="${CSS_ESC(itemId)}"]`);
  if (again) again.focus();
}

async function addStepFromInput(itemId) {
  const it = itemById(itemId);
  const input = panel().querySelector(`[data-zab-new-step="${CSS_ESC(itemId)}"]`);
  const text = input ? input.value.trim() : "";
  if (!it) return;
  if (!text) { S.msg = failText({ refused: "text-required" }); return render(); }
  const steps = zab.addStep(it.steps, text);
  await run(() => zab.editItem(db, S.ctx, itemId, { steps }), () => { it.steps = steps; });
  const again = panel().querySelector(`[data-zab-new-step="${CSS_ESC(itemId)}"]`);
  if (again) again.focus();
}
