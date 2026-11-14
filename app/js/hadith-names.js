/**
 * PCF MSA J106 S3 part 2 -- the madrasah's own names for the Hadith books and their chapters (Bangla names for the
 * Bukhari books and chapters, the Owner's open item). The owner or a prime edits; everyone in the madrasah reads.
 *
 * OFF until the Rules are published: hadith-names-switch.js. While it is off every function here is a no-op that returns
 * null or does nothing, and nothing is read. When on, the madrasah's list is read once on first use (after first paint,
 * in the Hadith Books view; one document read, flagged in the PR) and patched in memory after each write.
 * The pure half is hadith-names-model.js; the read and the write live in hadith-study-actions.js (loaded on first use, I9).
 */
import { t } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { el, readFailedNote, loadHadithStudyActions } from "./hadith-shared-ui.js";
import { namesEnabled } from "./hadith-names-switch.js";
import { namesFrom, nameOf, setName, retireName, bookKey, groupKey } from "./hadith-names-model.js";

let cache = null;      // { tenantId, names, docExists }
let known = {};        // the names as last read, for the places that need one now and cannot wait for a read
let editorOpen = false; // a saved change redraws the whole book view: the panel the owner was working in reopens, with its message
let pendingNote = null;

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
    const rows = [{ key: bookKey(versionUri), ar: titleAr }, ...chapters.filter((c) => String(c.title ?? "").trim()).map((c) => ({ key: groupKey(versionUri, c.id), ar: c.title }))];
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
      const save = button("hadith-subject-btn", t("Save name"));
      save.dataset.hadithNamesSave = r.key;
      save.addEventListener("click", () => { save.disabled = true; apply(() => setName(data.names, r.key, { bn: input.value, en: cur?.en ?? "" }, ctx()), t("Name saved."), t("The name could not be saved. Check the connection and try again.")); });
      const actions2 = el("div", "hadith-subject-edit-actions hadith-names-actions");
      actions2.appendChild(save);
      if (cur && cur.status !== "retired") {
        const rm = button("hadith-subject-btn", t("Remove name"));
        rm.dataset.hadithNamesRemove = r.key;
        rm.addEventListener("click", () => { rm.disabled = true; apply(() => retireName(data.names, r.key, ctx()), t("Name removed."), t("It could not be saved. Check the connection and try again.")); });
        actions2.appendChild(rm);
      }
      row.append(ar, input, actions2);
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

/** Test hook: forget the cached names. */
export function resetHadithNamesCache() { cache = null; known = {}; editorOpen = false; pendingNote = null; }
