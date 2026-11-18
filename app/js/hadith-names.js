/**
 * PCF MSA J106 S3 part 2 -- the madrasah's own names for the Hadith books and their chapters (Bangla names for the
 * Bukhari books and chapters, the Owner's open item). The owner or a prime edits; everyone in the madrasah reads.
 *
 * OFF until the Rules are published: hadith-names-switch.js. While it is off every function here is a no-op that returns
 * null or does nothing, and nothing is read. When on, the madrasah's list is read once on first use (after first paint,
 * in the Hadith Books view; one document read, flagged in the PR) and patched in memory after each write.
 * The pure half is hadith-names-model.js; the read and the write live in hadith-study-actions.js (loaded on first use, I9).
 */
import { draftNameOf, loadDraftNames } from "./hadith-draft-names.js";
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { el, readFailedNote, loadHadithStudyActions } from "./hadith-shared-ui.js";
import { namesEnabled } from "./hadith-names-switch.js";
import { namesFrom, nameOf, setName, retireName, bookKey, groupKey } from "./hadith-names-model.js";
import { KYS_WORDS, kysKey, kysOverride, kysTranslate, checkKysBn } from "./hadith-kys-words.js";

let cache = null;      // { tenantId, names, docExists }
let known = {};        // the names as last read, for the places that need one now and cannot wait for a read
let editorOpen = false; // a saved change redraws the whole book view: the panel the owner was working in reopens, with its message
let pendingNote = null;
let kysOpen = false;   // Know Your Status words: the same for the "Edit Bangla words" panel
let kysNote = null;

async function loadShared() {
  const actions = await loadHadithStudyActions();
  const session = await actions.getHadithSubjectsSession(); // the same owner/prime test the Rules make
  if (!session) return { session: null, actions, data: null };
  if (!cache || cache.tenantId !== session.tenantId) {
    const docData = await actions.getHadithNamesDoc(session.tenantId);
    cache = { tenantId: session.tenantId, names: namesFrom(docData), docExists: !!docData };
  }
  known = cache.names;
  return { session, actions, data: cache };
}

const shapeOf = () => JSON.stringify(Object.entries(known).map(([k, e]) => [k, e.status, e.bn, e.en]));

/** The name line under a row: the madrasah's own name for `key` in the reader's language, or null (off, none, or retired). */
export function nameLine(key) {
  if (!namesEnabled()) return null;
  const text = nameOf(known, key, getAppLang());
  if (!text) return null;
  const line = el("span", "hadith-row-own-name", text);
  line.dataset.hadithOwnName = key;
  if (getAppLang() === "bn") line.lang = "bn";
  return line;
}

/** The madrasah's own ENGLISH name for `key` whatever the reader's language (the chapter rows show English beside the Arabic, the Owner, 17 Nov 2026), or null. */
export function englishName(key) {
  if (!namesEnabled()) return null;
  return nameOf(known, key, "en");
}

/** Reads the madrasah's names once (signed-in only) and calls `onChanged()` when that changed what rows show. */
export function primeNames(onChanged) {
  if (!namesEnabled()) return;
  const before = shapeOf();
  loadShared().then(() => { if (shapeOf() !== before) onChanged?.(); }).catch(() => {});
}

function button(cls, text) {
  const b = el("button", cls, text);
  b.type = "button";
  return b;
}

/**
 * "Edit names" for the open book (owner or prime): the book's own name, then each chapter, each with a Bangla box, Save
 * and Remove. Nothing is read until the button is pressed on this page beyond primeNames(). Every change is saved on its
 * own; a refused write is said in words and the name is not shown as saved (I15). `onChange()` redraws after a saved change.
 */
export function renderNamesEditor(box, { versionUri, titleAr, chapters, onChange }) {
  if (!namesEnabled()) return;
  const startNote = pendingNote; pendingNote = null;
  const wrap = el("div", "hadith-names-editor");
  wrap.dataset.hadithNamesEditor = "";
  const open = button("hadith-subject-btn hadith-names-open", t("Edit names"));
  open.dataset.hadithNamesOpen = "";
  open.setAttribute("aria-expanded", "false");
  const panel = el("div", "hadith-names-panel");
  panel.hidden = true;
  wrap.append(open, panel);
  box.appendChild(wrap);

  async function draw(note = null) {
    panel.textContent = "";
    panel.appendChild(el("p", "hadith-note", t("Loading…")));
    let shared;
    try { shared = await loadShared(); } catch (err) { panel.textContent = ""; panel.appendChild(readFailedNote(err, draw)); return; }
    await loadDraftNames(versionUri).catch(() => {}); // the boxes start from the draft, so it must be read before they are drawn
    panel.textContent = "";
    const { session, actions, data } = shared;
    if (!session || !session.canManage) {
      const why = el("p", "hadith-note", t(session ? "Only the madrasah's owner or a prime can edit the names." : "Sign in to edit the names."));
      why.dataset.hadithNamesWhy = session ? "notAdmin" : "signedOut";
      panel.appendChild(why);
      return;
    }
    const msg = el("p", "hadith-note hadith-names-msg", note?.text ?? "");
    msg.setAttribute("role", "status");
    msg.dataset.hadithNamesMsg = "";
    if (note?.failed) msg.dataset.hadithNamesFailed = "";
    const ctx = () => ({ by: session.myPersonId ?? session.uid, at: new Date().toISOString() });
    const apply = async (fn, doneText, failText) => {
      const res = fn();
      if (res.error === "empty") { await draw({ text: t("Write the name first."), failed: true }); return; }
      if (res.error) { await draw({ text: failText, failed: true }); return; }
      if (!res.changed) { await draw(); return; }
      const keys = Object.keys(res.names).filter((k) => JSON.stringify(res.names[k]) !== JSON.stringify(data.names[k]));
      const ok = await actions.saveHadithNames({ tenantId: session.tenantId, names: res.names, keys, docExists: data.docExists, uid: session.uid });
      if (!ok) { await draw({ text: failText, failed: true }); return; }
      data.names = res.names; data.docExists = true; known = res.names;
      if (onChange) { pendingNote = { text: doneText }; onChange(); } else await draw({ text: doneText });
    };
    const rows = [{ key: bookKey(versionUri), ar: titleAr }, ...chapters.filter((c) => String(c.title ?? "").trim()).map((c) => ({ key: groupKey(versionUri, c.id), ar: c.title, id: c.id }))];
    for (const r of rows) {
      const row = el("div", "hadith-names-row");
      row.dataset.hadithNamesRow = r.key;
      const ar = el("span", "hadith-names-ar", r.ar);
      ar.lang = "ar"; ar.dir = "rtl";
      const cur = data.names[r.key];
      const input = el("input", "hadith-subject-edit-name");
      input.type = "text"; input.maxLength = 160; input.lang = "bn";
      input.value = cur && cur.status !== "retired" ? cur.bn : "";
      input.dataset.hadithNamesBn = r.key;
      input.placeholder = t("Bangla name");
      input.setAttribute("aria-label", t("Bangla name"));
      const inputEn = el("input", "hadith-subject-edit-name");
      inputEn.type = "text"; inputEn.maxLength = 160; inputEn.lang = "en";
      const draft = r.id ? draftNameOf(versionUri, r.id) : null;
      inputEn.value = cur?.en || draft || ""; // a retired name keeps its English words; with none, the draft starts the box (correct it, Save = your own name)
      if (!cur?.en && draft) inputEn.dataset.hadithNamesDraft = "";
      inputEn.addEventListener("input", () => { delete inputEn.dataset.hadithNamesDraft; }); // typing in the box, even the same words, makes the name the owner's own
      inputEn.dataset.hadithNamesEn = r.key;
      inputEn.placeholder = t("English name");
      inputEn.setAttribute("aria-label", t("English name"));
      const save = button("hadith-subject-btn", t("Save name"));
      save.dataset.hadithNamesSave = r.key;
      save.addEventListener("click", () => { save.disabled = true; apply(() => setName(data.names, r.key, { bn: input.value, en: (inputEn.dataset.hadithNamesDraft != null && inputEn.value === draft && input.value.trim()) ? "" : inputEn.value }, ctx()), t("Name saved."), t("The name could not be saved. Check the connection and try again.")); });
      const actions2 = el("div", "hadith-subject-edit-actions hadith-names-actions");
      actions2.appendChild(save);
      if (cur && cur.status !== "retired") {
        const rm = button("hadith-subject-btn", t("Remove name"));
        rm.dataset.hadithNamesRemove = r.key;
        rm.addEventListener("click", () => { rm.disabled = true; apply(() => retireName(data.names, r.key, ctx()), t("Name removed."), t("It could not be saved. Check the connection and try again.")); });
        actions2.appendChild(rm);
      }
      row.append(ar, input, inputEn, actions2);
      panel.appendChild(row);
    }
    panel.appendChild(msg);
  }

  const set = (show, note = null) => {
    editorOpen = show;
    panel.hidden = !show;
    open.setAttribute("aria-expanded", show ? "true" : "false");
    if (show) draw(note);
  };
  open.addEventListener("click", () => set(panel.hidden));
  if (editorOpen) set(true, startNote);
}

/**
 * t() for the Know Your Status words (PCF MSA J106, n106j 2.A): in Bangla, the madrasah's own correction when there is one,
 * else the app's built-in Bangla. English, a signed-out reader and the switch being off all get plain t().
 */
export function kysT(en, vars) {
  if (!namesEnabled()) return t(en, vars);
  return kysTranslate(known, getAppLang(), t, en, vars);
}

/**
 * "Edit Bangla words" (owner or prime only): the 40 Know Your Status words, each with the built-in Bangla, a box, Save and
 * "Restore built-in Bangla". The button is drawn only once the session is known to be owner/prime (nothing for anyone else).
 * One change is saved at a time; a refused write is said in words and nothing shows as saved (I15). `onChange()` redraws the page.
 */
export function renderKysWordsEditor(box, { onChange } = {}) {
  if (!namesEnabled()) return;
  const wrap = el("div", "hadith-names-editor hadith-kys-editor");
  wrap.dataset.hadithKysEditor = "";
  wrap.hidden = true;
  const open = button("hadith-subject-btn hadith-names-open", t("Edit Bangla words"));
  open.dataset.hadithKysOpen = "";
  open.setAttribute("aria-expanded", "false");
  const panel = el("div", "hadith-names-panel");
  panel.hidden = true;
  wrap.append(open, panel);
  box.appendChild(wrap);

  async function draw(note = null) {
    panel.textContent = "";
    panel.appendChild(el("p", "hadith-note", t("Loading…")));
    let shared, builtIn;
    try { [shared, builtIn] = await Promise.all([loadShared(), import("./i18n/bn.js").then((m) => m.BN)]); } catch (err) { panel.textContent = ""; panel.appendChild(readFailedNote(err, draw)); return; }
    panel.textContent = "";
    const { session, actions, data } = shared;
    if (!session || !session.canManage) { wrap.hidden = true; return; }
    const msg = el("p", "hadith-note hadith-names-msg", note?.text ?? "");
    msg.setAttribute("role", "status");
    msg.dataset.hadithNamesMsg = "";
    if (note?.failed) msg.dataset.hadithNamesFailed = "";
    const ctx = () => ({ by: session.myPersonId ?? session.uid, at: new Date().toISOString() });
    const apply = async (fn, doneText, failText) => {
      const res = fn();
      if (res.error) { await draw({ text: failText, failed: true }); return; }
      if (!res.changed) { await draw(); return; }
      const keys = Object.keys(res.names).filter((k) => JSON.stringify(res.names[k]) !== JSON.stringify(data.names[k]));
      const ok = await actions.saveHadithNames({ tenantId: session.tenantId, names: res.names, keys, docExists: data.docExists, uid: session.uid });
      if (!ok) { await draw({ text: failText, failed: true }); return; }
      data.names = res.names; data.docExists = true; known = res.names;
      if (onChange) { kysNote = { text: doneText }; onChange(); } else await draw({ text: doneText });
    };
    panel.appendChild(el("p", "hadith-note", t("These are the Bangla words on Know Your Status. Change one and everyone in the madrasah reads it. Keep every {…} as it is.")));
    for (const en of KYS_WORDS) {
      const key = kysKey(en);
      const built = builtIn[en] ?? en;
      const own = kysOverride(data.names, en, "bn");
      const row = el("div", "hadith-names-row");
      row.dataset.hadithKysRow = key;
      const src = el("span", "hadith-names-ar", en);
      src.lang = "en";
      const input = el("textarea", "hadith-subject-edit-name hadith-kys-box");
      input.rows = 2; input.maxLength = 160; input.lang = "bn";
      input.value = own ?? built;
      input.dataset.hadithKysBn = key;
      input.setAttribute("aria-label", `${t("Bangla words")}: ${en}`);
      const save = button("hadith-subject-btn", t("Save words"));
      save.dataset.hadithKysSave = key;
      save.addEventListener("click", () => {
        const bad = checkKysBn(en, input.value);
        if (bad) { msg.textContent = bad === "empty" ? t("Write the words first.") : t("Keep every {…} exactly as in the English line."); msg.dataset.hadithNamesFailed = ""; input.focus(); return; }
        const next = input.value.replace(/\s+/g, " ").trim();
        if (!own && next === built) { msg.textContent = t("That is already the built-in Bangla."); delete msg.dataset.hadithNamesFailed; return; }
        save.disabled = true;
        apply(() => setName(data.names, key, { bn: next, en: "" }, ctx()), t("Words saved."), t("The words could not be saved. Check the connection and try again."));
      });
      const acts = el("div", "hadith-subject-edit-actions hadith-names-actions");
      acts.appendChild(save);
      if (own) {
        const rm = button("hadith-subject-btn", t("Restore built-in Bangla"));
        rm.dataset.hadithKysRestore = key;
        rm.addEventListener("click", () => { rm.disabled = true; apply(() => retireName(data.names, key, ctx()), t("Built-in Bangla restored."), t("It could not be saved. Check the connection and try again.")); });
        acts.appendChild(rm);
      }
      row.append(src, input, acts);
      panel.appendChild(row);
    }
    panel.appendChild(msg);
  }

  const set = (show, note = null) => {
    kysOpen = show;
    panel.hidden = !show;
    open.setAttribute("aria-expanded", show ? "true" : "false");
    if (show) draw(note);
  };
  open.addEventListener("click", () => set(panel.hidden));
  // The button exists only for the owner or a prime: ask who is reading, once, and show it only then.
  loadShared().then(({ session }) => {
    if (!session || !session.canManage) return;
    wrap.hidden = false;
    if (kysOpen) { const n = kysNote; kysNote = null; set(true, n); }
  }).catch(() => {});
}

/** Test hook: forget the cached names. */
export function resetHadithNamesCache() { cache = null; known = {}; editorOpen = false; pendingNote = null; kysOpen = false; kysNote = null; }
