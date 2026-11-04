// Keys to Understanding -- the teacher's view (PCF MSA J03, round K4, 4 Nov 2026; the Owner's J03 Q4 A: "the teacher
// sees each student's marks"). The approved demo: docs/reference/2026-11-04-keys-demo/template.html ("Teacher's view").
//
// renderKeysTeacherView(host, { db, ctx, people, lang }) draws, for one sūrah (a picker, 1-114, default 1):
//   - one row per student in `people` (the students the viewer may record for: monitor.html's own scoped roster),
//     with how many āyāt, Qur'an words, hadith and hadith words they marked Difficult, Need practice and Done, and a
//     "Show on wheel" link;
//   - "Marked by most students": what most students marked Difficult or Need practice, each linking to its āyah or
//     hadith with back=1 (the way-back law, decision 86).
// The counting is keys-teacher-view-model.js (pure). Every read is ayah-keys-data.js's: ONE read per student per
// sūrah (loadPersonSurahKeys) and ONE per student for HadeethEnc (loadPersonHadithKeys, kept for the session, since
// it does not change with the sūrah). Nothing is read until this is called, and monitor.html calls it only when the
// teacher opens the section (I9: nothing joins the start-up path).
//
// Whether the viewer may read a student's marks is the Rules' call (canRecordFor() in the CANDIDATE
// docs/governance/2026-10-15-ayah-keys-candidate.rules). Until the Owner publishes it every read is refused, and the
// view says so in words (I15), never only in the console.
//
// "Show on wheel" opens ./quranrevival.html?surah=<s>&keysFor=<personId>&back=1. QR reads `keysFor` from its round
// K2 (the Status wheel showing that student's marks); until then the link opens the sūrah's page with ← Back.
//
// Shared component: the QR Lead may place the same view beside the wheel; it needs only a host element.

import { t, num, surahName } from "./i18n.js";
import { keyName, MARK_IDS } from "./ayah-keys.js";
import { loadPersonSurahKeys, loadPersonHadithKeys, HADITH_KEY_COLLECTIONS } from "./ayah-keys-data.js";
import { teacherViewModel, KEY_KINDS } from "./keys-teacher-view-model.js";
import { getSurahIndex } from "./quran-data.js";
import { langText } from "./lang.js";

const HADITH_COLLECTION = HADITH_KEY_COLLECTIONS[0]; // "hadeethenc", the one collection whose key is decided
const MOST_SHOWN = 12;

const CSS = `
.ktv { color: #222; }
.ktv-lede { color: #4a4a4a; font-size: 0.9rem; margin: 0.4rem 0 0.8rem; }
.ktv-pick { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin: 0.4rem 0 1rem; font-weight: 600; }
.ktv-pick select { min-height: 44px; max-width: 100%; min-width: 0; font-size: 1rem; }
.ktv-msg { padding: 0.7rem 0.9rem; border-radius: 0.5rem; background: #fdecc8; color: #5c3a00; border: 1px solid #c99a3c; margin: 0.6rem 0; }
.ktv-msg-error { background: #fbe3e0; color: #7a1f14; border-color: #c46b5f; }
.ktv-students { display: grid; gap: 0.7rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr)); }
.ktv-student { border: 1px solid #d5d5d5; border-radius: 0.6rem; padding: 0.7rem 0.8rem; background: #fff; min-width: 0; }
.ktv-student h4 { margin: 0 0 0.5rem; font-size: 1rem; color: #1F3A6E; overflow-wrap: anywhere; }
.ktv-line { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.35rem; margin: 0.45rem 0; }
.ktv-kind { flex: 0 0 100%; font-size: 0.86rem; color: #333; font-weight: 600; }
.ktv-chip { display: inline-block; border-radius: 999px; padding: 0.1rem 0.55rem; font-size: 0.82rem; font-variant-numeric: tabular-nums; border: 1px solid transparent; }
.ktv-chip-hard { background: #fbe3e0; color: #7a1f14; border-color: #e6b3ac; }
.ktv-chip-practice { background: #fdecc8; color: #5c3a00; border-color: #e5c27a; }
.ktv-chip-done { background: #d7efdf; color: #1d5a3c; border-color: #9fd0b0; }
.ktv-go { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; min-height: 44px; padding: 0.4rem 0.9rem;
  margin-top: 0.4rem; border-radius: 0.45rem; border: 1px solid #1F3A6E; color: #1F3A6E; background: #fff; text-decoration: none; font-weight: 600; }
.ktv-go:hover, .ktv-go:focus-visible { background: #1F3A6E; color: #fff; }
.ktv-most { list-style: none; padding: 0; margin: 0.4rem 0 0; display: grid; gap: 0.5rem; }
.ktv-most li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.6rem; border: 1px solid #e2e2e2; border-radius: 0.5rem; padding: 0.4rem 0.6rem; min-width: 0; }
.ktv-ref { font-weight: 700; color: #1F3A6E; overflow-wrap: anywhere; }
.ktv-n { color: #333; font-size: 0.86rem; }
.ktv-most .ktv-go { margin: 0 0 0 auto; }
.ktv-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.2rem 0.6rem; flex: 1 1 100%; min-width: 0; }
.ktv-chips { display: flex; flex-wrap: wrap; gap: 0.3rem 0.35rem; }
@media (min-width: 768px) { .ktv-head { flex: 0 1 auto; } }
.ktv h3 { font-size: 1.02rem; margin: 1.3rem 0 0.3rem; }
`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function ensureStyle() {
  if (document.getElementById("ktvStyle")) return;
  const s = document.createElement("style");
  s.id = "ktvStyle";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const KIND_LABEL = { ayah: "Āyāt", qword: "Qur'an words", hadith: "Hadith", hadithword: "Hadith words" };

/** The link a "Marked by most students" item opens, with back=1. */
export function linkForUnit(item) {
  if (item.kind === "ayah" || item.kind === "qword") return `./quranrevival.html?goto=${item.surah}:${item.ayah}&back=1`;
  return `./hadith-study.html?resume=hadith:${encodeURIComponent(item.collection)}:${encodeURIComponent(item.number)}&back=1`;
}
/** "Show on wheel" for one student (QR's K2 reads keysFor). */
export function wheelLinkFor(surah, personId) {
  return `./quranrevival.html?surah=${surah}&keysFor=${encodeURIComponent(personId)}&back=1`;
}

function refLabel(item) {
  if (item.kind === "ayah") return `${num(item.surah)}:${num(item.ayah)}`;
  if (item.kind === "qword") return t("{ref}, word {n}", { ref: `${num(item.surah)}:${num(item.ayah)}`, n: num(item.position) });
  if (item.kind === "hadith") return t("Hadith {n}", { n: num(item.number) });
  return t("Hadith {n}, word {w}", { n: num(item.number), w: num(item.position) });
}

function chips(counts, lang) {
  return MARK_IDS.map((m) => el("span", `ktv-chip ktv-chip-${m}`, `${keyName(m, lang)} ${num(counts[m] || 0)}`));
}

const refused = (err) => err && (err.code === "permission-denied" || /permission/i.test(String(err.message || "")));

/**
 * Draws the view into `host`. `people`: [{ id, name }] (name may be a language map, read with langText).
 * Returns { setSurah(n) } so a caller (or a test) can move to another sūrah.
 */
export function renderKeysTeacherView(host, { db, ctx, people, lang = "en" } = {}) {
  ensureStyle();
  host.textContent = "";
  const root = el("div", "ktv");
  root.setAttribute("data-ktv", "");
  root.appendChild(el("p", "ktv-lede", t("Your students mark āyāt, words and hadith for themselves: Difficult, Need practice or Done. Here you see each student's marks for one sūrah, and their hadith marks.")));
  const pick = el("label", "ktv-pick", t("Sūrah"));
  const select = el("select");
  select.setAttribute("data-ktv-surah", "");
  for (let n = 1; n <= 114; n++) { const o = el("option", null, num(n)); o.value = String(n); select.appendChild(o); }
  pick.appendChild(select);
  root.appendChild(pick);
  const body = el("div");
  body.setAttribute("data-ktv-body", "");
  body.setAttribute("aria-live", "polite");
  root.appendChild(body);
  host.appendChild(root);

  // Sūrah names, when the index loads (a number is shown until then, and if it does not).
  getSurahIndex().then((index) => {
    for (const o of select.options) {
      const s = index.find((x) => x.surahNumber === Number(o.value));
      if (s) o.textContent = `${num(s.surahNumber)} · ${surahName(s.surahNumber, s.nameEnglish)}`;
    }
  }).catch(() => {});

  const students = (Array.isArray(people) ? people : []).map((p) => ({ personId: p.id, name: typeof p.name === "string" ? p.name : langText(p.name, lang, p.id) }));
  const hadithCache = new Map(); // personId -> Promise of entries
  let drawSeq = 0;

  async function draw(surah) {
    const seq = ++drawSeq;
    body.textContent = "";
    if (!students.length) { body.appendChild(el("p", "ktv-n", t("No students in scope."))); return; }
    body.appendChild(el("p", "ktv-n", t("Loading…")));
    const rows = await Promise.all(students.map(async (s) => {
      if (!hadithCache.has(s.personId)) {
        const h = loadPersonHadithKeys(db, ctx, HADITH_COLLECTION, s.personId);
        h.catch(() => hadithCache.delete(s.personId)); // a failed read is tried again next time
        hadithCache.set(s.personId, h);
      }
      const [q, h] = await Promise.allSettled([loadPersonSurahKeys(db, ctx, surah, s.personId), hadithCache.get(s.personId)]);
      const err = q.status === "rejected" ? q.reason : h.status === "rejected" ? h.reason : null;
      return { ...s, surahDoc: q.value, hadithDoc: h.value, error: err ? (err.code || "error") : null, refused: refused(err) };
    }));
    if (seq !== drawSeq) return; // the teacher picked another sūrah meanwhile
    body.textContent = "";
    const model = teacherViewModel(rows, surah);
    const refusedAll = rows.length > 0 && rows.every((r) => r.refused);
    if (rows.some((r) => r.refused)) {
      const m = el("p", "ktv-msg", t("Your students' marks can be read once the Owner publishes the Keys Rules step."));
      m.setAttribute("data-ktv-refused", "");
      m.setAttribute("role", "status");
      body.appendChild(m);
    }
    if (refusedAll) return;

    const list = el("div", "ktv-students");
    for (const r of model.students) {
      const card = el("section", "ktv-student");
      card.setAttribute("data-ktv-person", r.personId);
      card.appendChild(el("h4", null, r.name));
      if (r.error) {
        const m = el("p", "ktv-msg ktv-msg-error", rows.find((x) => x.personId === r.personId).refused
          ? t("This student's marks cannot be read yet.")
          : t("Couldn't read this student's marks: {code}", { code: r.error }));
        m.setAttribute("data-ktv-failed", "");
        card.appendChild(m);
      } else {
        for (const kind of KEY_KINDS) {
          const line = el("div", "ktv-line");
          line.setAttribute("data-ktv-kind", kind);
          line.appendChild(el("span", "ktv-kind", t(KIND_LABEL[kind])));
          for (const c of chips(r.counts[kind], lang)) line.appendChild(c);
          card.appendChild(line);
        }
        const a = el("a", "ktv-go", t("Show on wheel"));
        a.href = wheelLinkFor(surah, r.personId);
        a.setAttribute("data-ktv-wheel", "");
        card.appendChild(a);
      }
      list.appendChild(card);
    }
    body.appendChild(list);

    body.appendChild(el("h3", null, t("Marked by most students")));
    body.appendChild(el("p", "ktv-n", t("What your students marked Difficult or Need practice, most students first. Done is counted beside it.")));
    if (!model.mostMarked.length) {
      body.appendChild(el("p", "ktv-n", t("Nothing in this sūrah or the hadith is marked Difficult or Need practice yet.")));
      return;
    }
    const ol = el("ol", "ktv-most");
    ol.setAttribute("data-ktv-most", "");
    for (const item of model.mostMarked.slice(0, MOST_SHOWN)) {
      const li = el("li");
      li.setAttribute("data-ktv-unit", item.unitKey);
      const head = el("span", "ktv-head");
      head.appendChild(el("span", "ktv-ref", refLabel(item)));
      head.appendChild(el("span", "ktv-n", item.students === 1 ? t("1 student") : t("{n} students", { n: num(item.students) })));
      li.appendChild(head);
      const cs = el("span", "ktv-chips");
      for (const c of chips(item.byMark, lang)) cs.appendChild(c);
      li.appendChild(cs);
      const a = el("a", "ktv-go", item.kind === "ayah" || item.kind === "qword" ? t("Open the āyah") : t("Open the hadith"));
      a.href = linkForUnit(item);
      li.appendChild(a);
      ol.appendChild(li);
    }
    body.appendChild(ol);
  }

  select.addEventListener("change", () => draw(Number(select.value)));
  draw(1);
  return { setSurah(n) { select.value = String(n); return draw(n); } };
}
