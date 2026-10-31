/**
 * PCF MSA J106 round 2 -- the Hadith Subject lists ("Add to subject"). The Owner answered A on question 5 (31 Oct
 * 2026): ONE SHARED ONLINE LIST per madrasah, stored in hadithSubjects/{tenantId}
 * (tests/firestore/hadith-subjects-v1.proposed.rules). Every member reads it; only the owner or a prime adds to it or
 * takes a hadith off it. Nothing is ever deleted (I4/D6): taking one off marks its entry `status: "retired"`, and
 * adding it again makes the same entry active again.
 *
 * An entry is a REFERENCE to a narration in Hadith Books ({ versionUri, n } is the passage's permanent position),
 * not a progress record, and it mints no Study Unit key (J06 is still the Owner's).
 *
 * The pure half (subjectsFrom ... subjectsHolding) imports nothing from Firebase. The read and the write live in
 * hadith-study-actions.js, which is loaded only on first use (I9), like every other Hadith write.
 */
import { t, num } from "./i18n.js";
import { el, readFailedNote, loadHadithStudyActions } from "./hadith-shared-ui.js";

/** The three Subjects' ids, in the Owner's order (HADITH_SUBJECTS in hadith-browser.js carries their names). */
export const SUBJECT_IDS = ["akhlaq", "ghayb", "stories"];

const ENTRY_FIELDS = ["versionUri", "n", "number", "kind", "std", "book", "bookAr", "chapterId", "chapter", "title"];

export const entryKey = (e) => `${e.versionUri}:${e.n}`;

/** The document's lists, always with all three ids present (an empty list for one the document lacks). */
export function subjectsFrom(docData) {
  const src = docData?.subjects ?? {};
  const out = {};
  for (const id of SUBJECT_IDS) out[id] = Array.isArray(src[id]) ? src[id].filter((e) => e && e.versionUri && Number.isFinite(Number(e.n))) : [];
  return out;
}

export function activeEntries(subjects, id) {
  return (subjects?.[id] ?? []).filter((e) => e.status !== "retired");
}

/** The Subjects a narration is on now (active entries only). */
export function subjectsHolding(subjects, key) {
  return SUBJECT_IDS.filter((id) => activeEntries(subjects, id).some((e) => entryKey(e) === key));
}

/**
 * A new subjects object with `ref` on Subject `id`. Already on it: unchanged (`changed: false`). Taken off before:
 * the same entry is made active again rather than a second one added, so a list never holds one narration twice.
 */
export function addEntry(subjects, id, ref, { by, at }) {
  if (!SUBJECT_IDS.includes(id)) throw new Error(`addEntry: unknown subject ${id}`);
  const key = entryKey(ref);
  const list = subjects[id] ?? [];
  const i = list.findIndex((e) => entryKey(e) === key);
  if (i >= 0 && list[i].status !== "retired") return { subjects, changed: false };
  const entry = { status: "active", addedAt: at, addedBy: by };
  for (const f of ENTRY_FIELDS) entry[f] = ref[f] ?? null;
  entry.n = Number(ref.n);
  const next = i >= 0 ? list.map((e, j) => (j === i ? { ...e, ...entry } : e)) : [...list, entry];
  return { subjects: { ...subjects, [id]: next }, changed: true };
}

/** A new subjects object with the narration taken off Subject `id` (its entry retired, never removed). */
export function retireEntry(subjects, id, key, { by, at }) {
  const list = subjects[id] ?? [];
  const i = list.findIndex((e) => entryKey(e) === key && e.status !== "retired");
  if (i < 0) return { subjects, changed: false };
  const next = list.map((e, j) => (j === i ? { ...e, status: "retired", retiredAt: at, retiredBy: by } : e));
  return { subjects: { ...subjects, [id]: next }, changed: true };
}

// ---------------------------------------------------------------------------
// The madrasah's lists, read once per madrasah on first use and patched in memory after each write (the harness
// stub never mutates its own data, and re-reading after a write would show stale data there).
// ---------------------------------------------------------------------------

let cache = null; // { tenantId, subjects, docExists }

async function loadShared() {
  const actions = await loadHadithStudyActions();
  const session = await actions.getHadithSubjectsSession();
  if (!session) return { session: null, actions, data: null };
  if (!cache || cache.tenantId !== session.tenantId) {
    const docData = await actions.getHadithSubjectsDoc(session.tenantId);
    cache = { tenantId: session.tenantId, subjects: subjectsFrom(docData), docExists: !!docData };
  }
  return { session, actions, data: cache };
}

/** Writes `next` and, only when it was saved, keeps it. Returns true on success (I15: a failure is shown). */
async function saveShared(session, actions, next) {
  const ok = await actions.saveHadithSubjects({ tenantId: session.tenantId, subjects: next, docExists: cache.docExists, uid: session.uid });
  if (ok) { cache.subjects = next; cache.docExists = true; }
  return ok;
}

const WHY_OFF = {
  signedOut: "Sign in to add a hadith to a Subject.",
  notAdmin: "Only the madrasah's owner or a prime can add a hadith to a Subject.",
};

function button(cls, text) {
  const b = el("button", cls, text);
  b.type = "button";
  return b;
}

/**
 * "Add to subject" under a narration in the Hadith Books reader. `ref` is the narration ({ versionUri, n, number,
 * kind, std, book, bookAr, chapterId, chapter, title }); `subjectName(id)` gives a Subject's name in the reader's
 * language. Nothing is read until the button is pressed (I9).
 */
export function subjectAddRow(ref, subjectName) {
  const box = el("div", "hadith-subject-add");
  box.dataset.hadithSubjectAdd = entryKey(ref);
  const open = button("hadith-subject-btn", t("Add to subject"));
  open.dataset.hadithSubjectAddOpen = "";
  open.setAttribute("aria-expanded", "false");
  const panel = el("div", "hadith-subject-choices");
  panel.hidden = true;
  box.append(open, panel);

  async function fill() {
    panel.textContent = "";
    panel.appendChild(el("p", "hadith-note", t("Loading…")));
    let shared;
    try { shared = await loadShared(); } catch (err) {
      panel.textContent = "";
      panel.appendChild(readFailedNote(err, fill));
      return;
    }
    panel.textContent = "";
    const { session, actions, data } = shared;
    if (!session || !session.canManage) {
      const why = el("p", "hadith-note hadith-subject-why", t(session ? WHY_OFF.notAdmin : WHY_OFF.signedOut));
      why.dataset.hadithSubjectWhy = session ? "notAdmin" : "signedOut";
      panel.appendChild(why);
      return;
    }
    const msg = el("p", "hadith-note hadith-subject-msg");
    msg.setAttribute("role", "status");
    msg.dataset.hadithSubjectMsg = "";
    const holding = new Set(subjectsHolding(data.subjects, entryKey(ref)));
    for (const id of SUBJECT_IDS) {
      const on = holding.has(id);
      const b = button("hadith-subject-btn hadith-subject-choice", on ? `✓ ${subjectName(id)}` : subjectName(id));
      b.dataset.hadithSubjectChoice = id;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.title = on ? t("Already in this Subject") : t("Add to this Subject");
      b.disabled = on;
      b.addEventListener("click", async () => {
        b.disabled = true;
        const { subjects: next, changed } = addEntry(cache.subjects, id, ref, { by: session.myPersonId ?? session.uid, at: new Date().toISOString() });
        if (!changed) { await fill(); return; }
        const ok = await saveShared(session, actions, next);
        await fill();
        const after = panel.querySelector("[data-hadith-subject-msg]");
        if (after) after.textContent = ok ? t("Added to {name}.", { name: subjectName(id) }) : t("It could not be added. Check the connection and try again.");
        if (after && !ok) after.dataset.hadithSubjectFailed = "";
      });
      panel.appendChild(b);
    }
    panel.appendChild(msg);
  }

  open.addEventListener("click", () => {
    const show = panel.hidden;
    panel.hidden = !show;
    open.setAttribute("aria-expanded", show ? "true" : "false");
    if (show) fill();
  });
  return box;
}

/**
 * A Subject's list: Book · Chapter · Hadith No. · Title, each opening the original (`openEntry(entry)`, which leaves
 * a way back here). The owner or a prime also sees "Remove" (the entry is retired, never deleted).
 */
export function renderSubjectList(box, id, subjectName, openEntry) {
  const list = el("div", "hadith-subject-list");
  list.dataset.hadithSubjectList = id;
  box.appendChild(list);

  async function draw() {
    list.textContent = "";
    list.appendChild(el("p", "hadith-note", t("Loading…")));
    let shared;
    try { shared = await loadShared(); } catch (err) {
      list.textContent = "";
      list.appendChild(readFailedNote(err, draw));
      return;
    }
    list.textContent = "";
    const { session, actions, data } = shared;
    if (!session) {
      const p = el("p", "hadith-note", t("Sign in to see your madrasah's Subjects."));
      p.dataset.hadithSubjectWhy = "signedOut";
      list.appendChild(p);
      return;
    }
    const entries = activeEntries(data.subjects, id);
    if (!entries.length) {
      const empty = el("p", "hadith-note hadith-subject-empty", t(session.canManage
        ? "No hadith in this list yet. Open a hadith in Hadith Books and choose “Add to subject”."
        : "No hadith in this list yet. The madrasah's owner or a prime adds them."));
      empty.dataset.hadithSubjectEmpty = "true";
      list.appendChild(empty);
      return;
    }
    const msg = el("p", "hadith-note hadith-subject-msg");
    msg.setAttribute("role", "status");
    msg.dataset.hadithSubjectMsg = "";
    for (const e of entries) {
      const row = el("div", "hadith-subject-row");
      row.dataset.hadithSubjectEntry = entryKey(e);
      const go = button("hadith-row hadith-subject-open", "");
      go.dataset.hadithSubjectOpen = entryKey(e);
      const book = el("span", "hadith-row-name", e.book || e.versionUri);
      const meta = el("span", "hadith-row-meta");
      const chapter = el("span", "hadith-subject-chapter", e.chapter || "");
      if (e.chapter) { chapter.lang = "ar"; chapter.dir = "rtl"; }
      const no = e.std || (e.number != null
        ? (e.kind === "passage" ? t("Passage {n}", { n: num(e.number) }) : t("Hadith {n}", { n: num(e.number) }))
        : "");
      meta.append(chapter, document.createTextNode(no ? ` · ${no}` : ""));
      const title = el("span", "hadith-subject-title", e.title || "");
      title.lang = "ar"; title.dir = "rtl";
      go.append(book, meta, title);
      go.title = [e.book, e.chapter, no].filter(Boolean).join(" · ");
      go.addEventListener("click", () => openEntry(e));
      row.appendChild(go);
      if (session.canManage) {
        const rm = button("hadith-subject-btn hadith-subject-remove", t("Remove"));
        rm.dataset.hadithSubjectRemove = entryKey(e);
        rm.setAttribute("aria-label", t("Remove from {name}", { name: subjectName(id) }));
        rm.addEventListener("click", async () => {
          rm.disabled = true;
          const { subjects: next, changed } = retireEntry(cache.subjects, id, entryKey(e), { by: session.myPersonId ?? session.uid, at: new Date().toISOString() });
          const ok = !changed || (await saveShared(session, actions, next));
          if (ok) { await draw(); return; }
          rm.disabled = false;
          msg.textContent = t("It could not be removed. Check the connection and try again.");
          msg.dataset.hadithSubjectFailed = "";
        });
        row.appendChild(rm);
      }
      list.appendChild(row);
    }
    list.appendChild(msg);
  }
  draw();
}

/** Test hook: forget the cached lists (a new sign-in, or a suite starting fresh). */
export function resetHadithSubjectsCache() { cache = null; }
