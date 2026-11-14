/**
 * Know Your Status (the Owner, 14 Nov 2026, demos approved): the study status of each hadith, seen in the list and on the
 * wheel. The status is set on the hadith's own card (a row of buttons under it) and kept on that hadith's bookmark; the
 * list shows one small icon above a hadith's text ONLY when it is marked; the wheel (the "Know Your Status" tab, and a link
 * on the card) shows the whole picture By Book then Chapters, or By Topic then Books.
 *
 * The pure half is hadith-status-model.js. The one read and the writes live in hadith-study-actions.js (loaded on first
 * use, I9). Nothing here is read at startup: the person's bookmarks are read once, after the reader list is drawn.
 */
import { t, num } from "./i18n.js";
import { el, loadHadithStudyActions, readFailedNote, openitiDisplayTitle } from "./hadith-shared-ui.js";
import { loadOpenitiBookSummaries, loadOpenitiBookIndex } from "./openiti-corpus.js";
import { loadSubjectChoices, activeEntries, subjectLabel } from "./hadith-subjects.js";
import { getAppLang } from "./prefs.js";
import {
  STATUSES, DEFAULT_DONE, NOT_MARKED_COLOR, statusPosition, countsByBook, countsByChapter, countsOfRefs, emptyCounts,
  markedOf, doneOf, percent, wheelGeometry,
} from "./hadith-status-model.js";

let known = new Map(); // position -> status id, as last read or written
const shapeOf = () => JSON.stringify([...known]);
const statusById = (id) => STATUSES.find((s) => s.id === id);
const label = (s) => t(s.label);
const shortLabel = (s) => t(s.short);

async function sessionAndActions() {
  const actions = await loadHadithStudyActions();
  const session = await actions.getHadeethEncSession();
  return { actions, session };
}

/** Reads this person's statuses once (signed in only) and calls `onChanged()` when that changed what the list shows. */
export function primeStatuses(onChanged) {
  const before = shapeOf();
  sessionAndActions().then(async ({ actions, session }) => {
    if (!session) return;
    known = new Map(await actions.getHadithStatusMap(session));
    if (shapeOf() !== before) onChanged?.();
  }).catch(() => {});
}

/** The small icon for a hadith, or null when it has no status (an unmarked hadith shows nothing). */
export function statusBadge(versionUri, n) {
  const s = statusById(known.get(statusPosition(versionUri, n)));
  if (!s) return null;
  const wrap = el("span", "hadith-status-badge");
  wrap.dataset.hadithStatusBadge = s.id;
  const i = el("i", `hadith-status-icon hs-${s.id}`, s.glyph);
  i.setAttribute("role", "img");
  i.setAttribute("aria-label", label(s));
  i.title = label(s);
  wrap.appendChild(i);
  return wrap;
}

/** Puts a hadith's badge in its list row right now (or takes it away), without redrawing the panes. */
function paintListBadge(versionUri, n) {
  const row = document.querySelector(`[data-openiti-row="${n}"]`);
  if (!row) return;
  row.querySelector("[data-hadith-status-badge]")?.remove();
  const b = statusBadge(versionUri, n);
  if (b) row.insertBefore(b, row.querySelector(".hadith-reader-snippet"));
}

function button(cls, text) { const b = el("button", cls, text); b.type = "button"; return b; }

/**
 * Under a hadith's card: "My status" with the statuses as buttons. Press one to set it, press it again to clear it. Nothing is
 * read until the card is drawn (and then only the person's own bookmarks, once). `ref` is { versionUri, n, name }.
 * `openWheel()` opens the wheel with a way back to this hadith.
 */
export function renderStatusRow(pane, ref, { openWheel } = {}) {
  const box = el("div", "hadith-status-row");
  box.dataset.hadithStatusRow = statusPosition(ref.versionUri, ref.n);
  pane.appendChild(box);
  const head = el("div", "hadith-status-head");
  head.appendChild(el("span", "hadith-status-title", t("My status")));
  box.appendChild(head);
  const body = el("div", "hadith-status-body");
  box.appendChild(body);

  async function draw(note = null) {
    let ctx;
    try { ctx = await sessionAndActions(); } catch (err) { body.textContent = ""; body.appendChild(readFailedNote(err, () => draw())); return; }
    const { actions, session } = ctx;
    body.textContent = "";
    if (!session) {
      const why = el("p", "hadith-note", t("Sign in and choose who you're studying as to mark a hadith."));
      why.dataset.hadithStatusWhy = "signedOut";
      body.appendChild(why);
      return;
    }
    if (!session.canRecordFor) {
      const why = el("p", "hadith-note", t("You can view this, but only the person's own record can be marked."));
      why.dataset.hadithStatusWhy = "notAllowed";
      body.appendChild(why);
      return;
    }
    let map;
    try { map = await actions.getHadithStatusMap(session); } catch (err) { body.textContent = ""; body.appendChild(readFailedNote(err, () => draw())); return; }
    known = new Map(map);
    const cur = known.get(statusPosition(ref.versionUri, ref.n)) ?? null;
    const chips = el("div", "hadith-status-chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", t("Study status of this hadith"));
    for (const s of STATUSES) {
      const b = button("hadith-status-chip", "");
      b.dataset.hadithStatusSet = s.id;
      b.setAttribute("aria-pressed", cur === s.id ? "true" : "false");
      b.append(el("span", `hs-glyph hs-${s.id}`, s.glyph), el("span", "hs-t", shortLabel(s)));
      b.addEventListener("click", async () => {
        chips.querySelectorAll("button").forEach((x) => { x.disabled = true; });
        const next = cur === s.id ? null : s.id;
        try {
          known = new Map(await actions.setHadithStatus(session, { versionUri: ref.versionUri, n: ref.n, name: ref.name, status: next }));
          paintListBadge(ref.versionUri, ref.n);
          await draw({ text: next ? t("Saved on its bookmark as {name}.", { name: label(s) }) : t("Status cleared. The bookmark stays.") });
        } catch (err) {
          console.error(err);
          await draw({ text: t("The status could not be saved. Check the connection and try again."), failed: true });
        }
      });
      chips.appendChild(b);
    }
    body.appendChild(chips);
    const msg = el("p", "hadith-note hadith-status-msg", note?.text ?? "");
    msg.setAttribute("role", "status");
    msg.dataset.hadithStatusMsg = "";
    if (note?.failed) msg.dataset.hadithStatusFailed = "";
    body.appendChild(msg);
    if (openWheel) {
      const w = button("hadith-status-wheel-link", t("Know Your Status ›"));
      w.dataset.hadithStatusOpenWheel = "";
      w.addEventListener("click", openWheel);
      body.appendChild(w);
    }
  }
  body.appendChild(el("p", "hadith-note", t("Loading…")));
  draw();
}

// ---------------------------------------------------------------------------
// The wheel
// ---------------------------------------------------------------------------
const DONE_KEY = "hadith.status.done";
function loadDone() {
  try { const raw = JSON.parse(localStorage.getItem(DONE_KEY) ?? "null"); if (Array.isArray(raw)) return new Set(raw.filter((id) => statusById(id))); } catch { /* blocked or bad: the default */ }
  return new Set(DEFAULT_DONE);
}
function saveDone(set) { try { localStorage.setItem(DONE_KEY, JSON.stringify([...set])); } catch { /* a per-viewer convenience only */ } }

const CHAPTER_CAP = 30;

/**
 * The Know Your Status view. `state.statusView` holds { mode: "book" | "topic", level: 1 | 2, parent, sel, showAll, done }.
 * `back` (optional) is { label, go } for a way back to where the reader came from (the way-back law).
 */
export function renderStatusWheel(body, state, rerender, back = null) {
  const v = (state.statusView ??= { mode: "book", level: 1, parent: null, sel: null, showAll: false, done: loadDone() });
  const root = el("section", "hadith-status-wheel");
  root.dataset.hadithStatusWheel = "";
  body.appendChild(root);
  root.appendChild(el("p", "hadith-note", t("Loading…")));

  (async () => {
    const { actions, session } = await sessionAndActions();
    root.textContent = "";
    if (back) {
      const b = button("hadith-subject-btn hadith-status-back-home", back.label);
      b.dataset.hadithStatusBackHome = "";
      b.addEventListener("click", back.go);
      root.appendChild(b);
    }
    root.appendChild(el("h2", "hadith-status-h", t("Know Your Status")));
    if (!session) {
      const why = el("p", "hadith-note", t("Sign in and choose who you're studying as to see your status."));
      why.dataset.hadithStatusWhy = "signedOut";
      root.appendChild(why);
      return;
    }
    const map = new Map(await actions.getHadithStatusMap(session));
    known = map;
    const books = await loadOpenitiBookSummaries();
    const bookTotal = (idx) => idx.hadithCount ?? idx.passageCount ?? 0;
    const bookName = (uri) => { const f = books.find(([u]) => u === uri); return f ? { en: f[1].titleEn, ar: f[1].titleAr } : { en: uri, ar: "" }; };
    let units = [], topicRefs = null, subjectData = null, note = null;
    if (v.mode === "book" && v.level === 1) {
      const by = countsByBook(map);
      units = books.map(([uri, idx]) => ({ key: uri, en: idx.titleEn, ar: idx.titleAr, total: bookTotal(idx), counts: by.get(uri) ?? emptyCounts(), kids: true, ref: uri })).filter((u) => u.total > 0);
    } else if (v.mode === "book") {
      const idx = await loadOpenitiBookIndex(v.parent);
      const by = countsByChapter(map, v.parent, idx);
      let all = idx.chapters.map((c, i) => ({ key: c.id, en: t("Chapter {n}", { n: num(i + 1) }), ar: openitiDisplayTitle(c.title ?? ""), total: c.hadithCount ?? c.passageCount ?? 0, counts: by.get(c.id) ?? emptyCounts() })).filter((u) => u.total > 0 && u.ar);
      if (all.length > CHAPTER_CAP && !v.showAll) {
        const marked = all.filter((u) => markedOf(u.counts) > 0);
        const shown = marked.length ? marked : all.slice(0, CHAPTER_CAP);
        note = { shown: shown.length, of: all.length, marked: marked.length > 0 };
        all = shown;
      } else if (all.length > CHAPTER_CAP) note = { shown: all.length, of: all.length, all: true };
      units = all;
    } else {
      const sc = await loadSubjectChoices();
      subjectData = sc;
      const lists = sc.data?.subjects ?? {};
      if (v.level === 1) {
        units = sc.subjects.map((s) => { const refs = activeEntries(lists, s.id); return { key: s.id, en: subjectLabel(s, getAppLang()), total: refs.length, counts: countsOfRefs(refs, map), kids: true, ref: s.id }; }).filter((u) => u.total > 0);
      } else {
        const refs = activeEntries(lists, v.parent), groups = new Map();
        for (const r of refs) { const g = groups.get(r.versionUri) ?? []; g.push(r); groups.set(r.versionUri, g); }
        units = [...groups].map(([uri, rs]) => ({ key: uri, en: bookName(uri).en, ar: bookName(uri).ar, total: rs.length, counts: countsOfRefs(rs, map) }));
      }
    }
    if (v.sel !== null && v.sel >= units.length) v.sel = null;

    // mode switch + trail
    const modes = el("div", "hadith-status-modes");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", t("Group the wheel by"));
    for (const [m, text] of [["book", t("By Book")], ["topic", t("By Topic")]]) {
      const b = button("hadith-status-mode", text);
      b.dataset.hadithStatusMode = m;
      b.setAttribute("aria-pressed", v.mode === m ? "true" : "false");
      b.addEventListener("click", () => { Object.assign(v, { mode: m, level: 1, parent: null, sel: null, showAll: false }); rerender(); });
      modes.appendChild(b);
    }
    root.appendChild(modes);
    const trail = el("div", "hadith-status-trail");
    const rootName = v.mode === "book" ? t("All books") : t("All topics");
    if (v.level === 1) {
      trail.append(el("span", "hs-here", rootName), el("span", "hs-sub", v.mode === "book" ? t("Book, then Chapters") : t("Topic, then Books")));
    } else {
      const bk = button("hadith-status-back", `← ${rootName}`);
      bk.dataset.hadithStatusBack = "";
      bk.addEventListener("click", () => { Object.assign(v, { level: 1, parent: null, sel: null, showAll: false }); rerender(); });
      const here = v.mode === "book" ? bookName(v.parent).en : (subjectData?.subjects.find((s) => s.id === v.parent) ? subjectLabel(subjectData.subjects.find((s) => s.id === v.parent), getAppLang()) : v.parent);
      trail.append(bk, el("span", "hs-here", here));
    }
    root.appendChild(trail);

    const card = el("div", "hadith-status-pane");
    root.appendChild(card);
    if (!units.length) {
      const empty = el("p", "hadith-note hadith-status-empty", t(v.mode === "topic" ? "No hadith are filed under a topic yet." : "Nothing to show here yet."));
      empty.dataset.hadithStatusEmpty = "";
      card.appendChild(empty);
      return;
    }
    const doneSet = v.done;
    const sumAll = units.reduce((a, u) => ({ t: a.t + u.total, m: a.m + markedOf(u.counts), d: a.d + doneOf(u.counts, doneSet) }), { t: 0, m: 0, d: 0 });
    const selU = v.sel !== null ? units[v.sel] : null;

    // the wheel
    const geo = wheelGeometry(units);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 300 300");
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-label", t("Progress wheel"));
    svg.classList.add("hadith-status-svg");
    const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, val); if (text != null) e.textContent = text; return e; };
    units.forEach((u, i) => {
      const g = mk("g", { class: `hs-seg${v.sel === i ? " sel" : ""}${v.sel !== null && v.sel !== i ? " dim" : ""}`, tabindex: "0", role: "button", "data-i": String(i), "aria-label": `${u.en}${u.ar ? ", " + u.ar : ""}: ${t("{n} percent done", { n: num(percent(doneOf(u.counts, doneSet), u.total)) })}` });
      g.appendChild(mk("path", { d: geo[i].outline, fill: NOT_MARKED_COLOR }));
      for (const b of geo[i].bands) g.appendChild(mk("path", { d: b.d, fill: statusById(b.id).color, "data-band": b.id }));
      g.appendChild(mk("path", { d: geo[i].outline, class: "hs-ring" }));
      if (units.length <= 24) {
        const a = geo[i].mid, r = 100;
        g.appendChild(mk("text", { class: "hs-num", x: (150 + r * Math.cos(a)).toFixed(1), y: (150 + r * Math.sin(a) + 4).toFixed(1) }, num(i + 1)));
      }
      const pick = () => { v.sel = v.sel === i ? null : i; rerender(); };
      g.addEventListener("click", pick);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      svg.appendChild(g);
    });
    const cd = selU ? doneOf(selU.counts, doneSet) : sumAll.d, ct = selU ? selU.total : sumAll.t;
    svg.appendChild(mk("circle", { class: "hs-hub", cx: "150", cy: "150", r: "46" }));
    const big = mk("text", { class: "hs-hub-big", x: "150", y: "155" }, `${num(percent(cd, ct))}%`); big.dataset.hadithStatusCentre = "pct";
    svg.appendChild(big);
    const sub = mk("text", { class: "hs-hub-small", x: "150", y: "173" }, t("{a} of {b}", { a: num(cd), b: num(ct) })); sub.dataset.hadithStatusCentre = "count";
    svg.appendChild(sub);
    svg.appendChild(mk("text", { class: "hs-hub-small", x: "150", y: "186", style: "font-size:9px" }, t("done")));
    const wb = el("div", "hadith-status-wheel-box");
    wb.appendChild(svg);
    card.appendChild(wb);

    // legend + counts as done
    const legend = el("ul", "hadith-status-legend");
    for (const s of STATUSES) {
      const li = el("li", null, "");
      const sw = el("span", "hs-sw"); sw.style.background = s.color;
      li.append(sw, el("span", "hs-glyph", s.glyph), document.createTextNode(label(s)));
      legend.appendChild(li);
    }
    const nm = el("li", null, ""); const sw0 = el("span", "hs-sw"); sw0.style.background = NOT_MARKED_COLOR; nm.append(sw0, document.createTextNode(t("Not marked"))); legend.appendChild(nm);
    card.appendChild(legend);
    const fs = el("fieldset", "hadith-status-done");
    fs.appendChild(el("legend", null, t("Counts as done")));
    for (const s of STATUSES) {
      const lab = el("label", null, "");
      const cb = el("input"); cb.type = "checkbox"; cb.checked = doneSet.has(s.id); cb.dataset.hadithStatusDone = s.id;
      cb.addEventListener("change", () => { if (cb.checked) v.done.add(s.id); else v.done.delete(s.id); saveDone(v.done); rerender(); });
      lab.append(cb, el("span", "hs-glyph", s.glyph), document.createTextNode(label(s)));
      fs.appendChild(lab);
    }
    card.appendChild(fs);

    // detail strip
    const detail = el("div", "hadith-status-detail");
    detail.setAttribute("aria-live", "polite");
    if (selU) {
      const h = el("h3", null, "");
      h.append(document.createTextNode(`${v.sel + 1}. ${selU.en} `));
      if (selU.ar) { const a = el("span", "hs-ar", selU.ar); a.lang = "ar"; a.dir = "rtl"; h.appendChild(a); }
      detail.appendChild(h);
      const cs = el("div", "hs-counts");
      for (const s of STATUSES) { const sp = el("span", null, ""); const g = el("span", "hs-glyph", s.glyph); g.style.color = s.color; sp.append(g, el("b", null, num(selU.counts[s.id] || 0)), document.createTextNode(` ${label(s).toLowerCase()}`)); cs.appendChild(sp); }
      const nmk = el("span", null, ""); nmk.append(el("b", null, num(selU.total - markedOf(selU.counts))), document.createTextNode(` ${t("not marked").toLowerCase()}`)); cs.appendChild(nmk);
      detail.appendChild(cs);
      detail.appendChild(el("p", "hadith-note", t("{a} of {b} done ({p}%). {m} marked in some way.", { a: num(doneOf(selU.counts, doneSet)), b: num(selU.total), p: num(percent(doneOf(selU.counts, doneSet), selU.total)), m: num(markedOf(selU.counts)) })));
      if (selU.kids) {
        const open = button("hadith-status-open", v.mode === "book" ? t("Open chapters ›") : t("Open books ›"));
        open.dataset.hadithStatusOpen = "";
        open.addEventListener("click", () => { Object.assign(v, { level: 2, parent: selU.ref, sel: null, showAll: false }); rerender(); });
        detail.appendChild(open);
      }
    } else {
      detail.appendChild(el("p", "hadith-note", t("Tap a segment or a row. The centre shows the share done: {a} of {b} hadith ({m} are marked in some way).", { a: num(sumAll.d), b: num(sumAll.t), m: num(sumAll.m) })));
    }
    card.appendChild(detail);

    if (note) {
      const nt = el("p", "hadith-note hadith-status-capnote", note.all ? t("Showing all {n} chapters.", { n: num(note.of) }) : note.marked ? t("Showing the {a} of {b} chapters you have marked.", { a: num(note.shown), b: num(note.of) }) : t("Showing the first {a} of {b} chapters. Mark a hadith to see its chapter here.", { a: num(note.shown), b: num(note.of) }));
      card.appendChild(nt);
      const tg = button("hadith-subject-btn hadith-status-showall", note.all ? t("Show only marked chapters") : t("Show all chapters"));
      tg.dataset.hadithStatusShowAll = "";
      tg.addEventListener("click", () => { v.showAll = !note.all; v.sel = null; rerender(); });
      card.appendChild(tg);
    }

    // the same, in words
    const rows = el("ul", "hadith-status-rows");
    units.forEach((u, i) => {
      const li = el("li");
      const r = button(`hadith-status-wrow${v.sel === i ? " sel" : ""}`, "");
      r.dataset.i = String(i);
      const nameBox = el("span", "hs-name");
      nameBox.appendChild(document.createTextNode(u.en));
      if (u.ar) { const a = el("span", "hs-ar", u.ar); a.lang = "ar"; a.dir = "rtl"; nameBox.appendChild(a); }
      const bar = el("span", "hs-bar"); bar.setAttribute("aria-hidden", "true");
      for (const s of STATUSES) { const c = u.counts[s.id] || 0; if (c) { const seg = el("span"); seg.style.width = `${(100 * c / u.total).toFixed(2)}%`; seg.style.background = s.color; bar.appendChild(seg); } }
      nameBox.appendChild(bar);
      r.append(el("span", "hs-n", num(i + 1)), nameBox, el("span", "hs-pc", `${num(percent(doneOf(u.counts, doneSet), u.total))}%`));
      r.addEventListener("click", () => { v.sel = v.sel === i ? null : i; rerender(); });
      li.appendChild(r);
      rows.appendChild(li);
    });
    card.appendChild(rows);
  })().catch((err) => { root.textContent = ""; root.appendChild(readFailedNote(err, rerender)); });
}

/** Test hook: forget what was read. */
export function resetHadithStatusKnown() { known = new Map(); }
