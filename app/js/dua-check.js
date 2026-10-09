// Decision 96, "Check a dua" -- the review screen on the Dua card (the Owner: "Dua. yes to all."). The build target is
// docs/reference/2026-10-09-dua-check-demo.html.
//
// A person who may check (Owner, Prime) opens a panel under the card and works through three steps: (1) which of the
// narrations found by matching words really are this dua, (2) whether the picked words, their vowels and their Qur'an
// links are right, (3) save. What is saved is COMPACT: only what is not "same" or "right" (see buildCheck), so a dua
// checked clean costs a few lines of the madrasah's document, not a copy of the dua.
//
// This file is Firebase-free (the write lives in dua-check-data.js, loaded lazily by hadith-browser.js), so the pure
// half runs under node and the panel is the same code the page runs.

import { t, num } from "./i18n.js";
import { getAppLang } from "./prefs.js";
import { duaWords, duaWordTokens } from "./dua-words.js";
import { loadOpenitiBookIndex, loadOpenitiChapter } from "./openiti-corpus.js";

export const DUA_CHECK_SCHEMA_VERSION = 1;

/** Arabic without vowels or script marks, alef forms made one -- hamza seats (أ إ ؤ ئ) are kept APART on purpose. */
export function bare(s) {
  return String(s).replace(/[ً-ٰٟۖ-ۭـ࣓-ࣿ]/g, "").replace(/ٱ/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim();
}

/** A member's compact, rebuild-proof name: the book's first four digits and three letters, then ":" and the number. */
export function memberKey(versionUri, n) {
  const seg = String(versionUri).split(".");
  return `${seg[0].slice(0, 4)}${(seg[1] ?? "").slice(0, 3)}:${n}`;
}

/** The members of a card in the order a check shows them: lowest share first (ties keep the card's order). */
export function memberOrder(fit, count) {
  const idx = Array.from({ length: count }, (_, i) => i);
  const share = (i) => (Array.isArray(fit?.[i]) && Number.isFinite(fit[i][0]) ? fit[i][0] : 1);
  return idx.sort((a, b) => share(a) - share(b) || a - b);
}

export const looksDifferent = (fitEntry) => fitEntry?.[1] === "low" || fitEntry?.[1] === "short";

/** Why the computer is unsure about a word, or null: no link, or a link whose spelling differs from the word. */
export function wordDoubt(vowelled, linkEntry, grammar) {
  if (!linkEntry) return grammar ? "guess" : "none";
  return bare(linkEntry[2]) !== bare(vowelled) ? "spelling" : null;
}

/** The panel's words in the order a check shows them: doubtful first, then the card's order. */
export function wordOrder(words) {
  return [...words].sort((a, b) => (b.doubt ? 1 : 0) - (a.doubt ? 1 : 0) || a.i - b.i);
}

/**
 * The stored form. members: [{ key, v }] (v "same" | "cut" | "unsure" | null); words: [{ i, v: "ok"|"fix"|null, fix,
 * unlink }]. Only what is not "same"/"right" is kept. `done` is false while anything is open or unsure; then the open
 * ones are listed too, so a part-way check reopens exactly where it stopped.
 */
export function buildCheck({ members, words, together = true, originals = {} }) {
  const cut = members.filter((m) => m.v === "cut").map((m) => m.key);
  const unsure = members.filter((m) => m.v === "unsure").map((m) => m.key);
  const openM = members.filter((m) => !m.v).map((m) => m.key);
  const fix = {}, unlink = [], openW = [];
  for (const w of words) {
    if (!w.v) openW.push(w.i);
    else if (w.v === "fix") {
      const text = String(w.fix ?? "").trim();
      if (text && text !== originals[w.i]) fix[w.i] = text;
      if (w.unlink) unlink.push(w.i);
    }
  }
  const done = !unsure.length && !openM.length && !openW.length;
  const out = { schemaVersion: DUA_CHECK_SCHEMA_VERSION, done };
  if (cut.length) { out.cut = cut; out.together = !!together; }
  if (unsure.length) out.unsure = unsure;
  if (Object.keys(fix).length) out.fix = fix;
  if (unlink.length) out.unlink = unlink;
  if (!done) { if (openM.length) out.open = openM; if (openW.length) out.openW = openW; }
  return out;
}

/** "none" (no check yet) | "partly" | "done". */
export function checkState(check) {
  if (!check || typeof check !== "object") return "none";
  return check.done ? "done" : "partly";
}

/** Splits a card's members by a check: { kept, movedOut } (the anchor is never moved out). */
export function applyMembers(members, anchor, summaryBooks, check) {
  const cut = new Set(Array.isArray(check?.cut) ? check.cut : []);
  const kept = [], movedOut = [];
  for (const m of members) {
    const isAnchor = m[0] === anchor[0] && m[1] === anchor[1];
    const key = memberKey(summaryBooks[m[0]].versionUri, m[1]);
    (cut.has(key) && !isAnchor ? movedOut : kept).push(m);
  }
  return { kept, movedOut };
}

/** The date on a status chip, in the reader's language. */
export function checkDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try { return d.toLocaleDateString(getAppLang() === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; }
}

/** The status chip's words for a stored check (null when there is none). */
export function checkChipText(check) {
  const st = checkState(check);
  if (st === "none") return null;
  const vars = { name: check.byName || check.by || "", date: checkDate(check.at) };
  return st === "done" ? t("✓ checked by {name} · {date}", vars) : t("partly checked by {name} · {date}", vars);
}

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const btn = (label, cls, onClick) => {
  const b = el("button", cls, label);
  b.type = "button";
  if (onClick) b.addEventListener("click", onClick);
  return b;
};

/** The narration texts of a card's members, in the card's order (each a string, "" when it cannot be read). */
export async function loadMemberTexts(card, books) {
  const byBook = new Map();
  for (const m of card.members) { if (!byBook.has(m[0])) byBook.set(m[0], []); byBook.get(m[0]).push(m[1]); }
  const texts = new Map();
  await Promise.all([...byBook].map(async ([b, ns]) => {
    const uri = books[b].versionUri;
    const index = await loadOpenitiBookIndex(uri);
    const chapters = new Map();
    for (const n of ns) { const ch = index.chapters.find((c) => (c.hadithPositions ?? []).includes(n)); if (ch) chapters.set(ch.id, ch); }
    await Promise.all([...chapters.values()].map(async (ch) => {
      const data = await loadOpenitiChapter(uri, ch);
      for (const h of data.hadiths) if (ns.includes(h.n)) texts.set(`${b}:${h.n}`, h.text);
    }));
  }));
  return card.members.map((m) => texts.get(`${m[0]}:${m[1]}`) ?? "");
}

/** The text with the dua's own words marked (a <p>). */
function textWithMarks(text, own) {
  const p = el("p", "dua-check-text");
  p.lang = "ar"; p.dir = "rtl";
  String(text).split(/\s+/).filter(Boolean).forEach((w, k) => {
    if (k) p.appendChild(document.createTextNode(" "));
    if (own.has(bare(w))) p.appendChild(el("mark", null, w)); else p.appendChild(document.createTextNode(w));
  });
  return p;
}

/**
 * The check panel. `card` is the cards file's row, `books` the summary's books; `fit` this dua's fit rows (or null);
 * `words` [{ i, text, link, grammar }] are the card's words as the card shows them BEFORE any check; `existing` the
 * stored check (or null); `onBack()` closes; `onSave(check)` saves and must throw on failure (I15).
 */
export function buildCheckPanel({ card, books, fit, words, existing, textsPromise, onBack, onSave }) {
  const dua = card.dua;
  const panel = el("section", "hadith-card dua-check-panel");
  panel.dataset.duaCheckPanel = String(dua);
  panel.setAttribute("aria-label", t("Check Dua {n}", { n: num(dua) }));
  const back = btn(t("← Back to Dua {n}", { n: num(dua) }), "dua-ref dua-check-back", () => onBack());
  back.dataset.duaCheckBack = "true";
  panel.appendChild(back);
  panel.appendChild(el("h3", "dua-check-title", t("Check Dua {n}", { n: num(dua) })));

  const cutSet = new Set(existing?.cut ?? []), unsureSet = new Set(existing?.unsure ?? []), openMSet = new Set(existing?.open ?? []);
  const openWSet = new Set(existing?.openW ?? []);
  const fresh = !existing;
  const order = memberOrder(fit, card.members.length);
  const members = order.map((idx, rank) => {
    const [b, n, std, number] = card.members[idx];
    const key = memberKey(books[b].versionUri, n);
    const isAnchor = b === card.anchor[0] && n === card.anchor[1];
    const v = fresh ? null : cutSet.has(key) && !isAnchor ? "cut" : unsureSet.has(key) ? "unsure" : openMSet.has(key) ? null : "same";
    return { idx, rank, b, n, std, number, key, isAnchor, fit: fit?.[idx] ?? null, v, text: "" };
  });
  const wordRows = words.map((w) => {
    const fixed = existing?.fix?.[w.i];
    const unlinked = (existing?.unlink ?? []).includes(w.i);
    const v = fresh ? null : openWSet.has(w.i) ? null : fixed || unlinked ? "fix" : "ok";
    return { ...w, doubt: wordDoubt(w.text, w.link, w.grammar), v, fix: fixed ?? w.text, unlink: unlinked };
  });
  const originals = Object.fromEntries(words.map((w) => [w.i, w.text]));
  let together = existing?.together !== false;
  let step = 1;

  const tabs = el("div", "dua-check-steps");
  tabs.setAttribute("role", "tablist");
  const stepBox = el("div", "dua-check-body");
  const saveMsg = el("p", "hadith-note dua-check-msg");
  saveMsg.setAttribute("role", "status");
  const own = new Set(duaWordTokens(duaWords(card.text)?.words ?? "").map(bare));

  const count = (list, f) => list.filter(f).length;
  const verdictBtns = (row, defs, rerender) => {
    const box = el("div", "dua-check-verdict");
    for (const [v, label] of defs) {
      const b = btn(label, "dua-ref", () => { row.v = row.v === v ? null : v; rerender(); });
      b.dataset.v = v;
      b.setAttribute("aria-pressed", String(row.v === v));
      box.appendChild(b);
    }
    return box;
  };

  const renderMembers = () => {
    const box = el("div", "dua-check-list");
    const open = count(members, (m) => !m.v);
    box.appendChild(el("p", "hadith-note dua-check-summary", t("Narrations: {total} · same dua {same} · a different dua {cut} · not sure {unsure} · not checked yet {open}",
      { total: num(members.length), same: num(count(members, (m) => m.v === "same")), cut: num(count(members, (m) => m.v === "cut")), unsure: num(count(members, (m) => m.v === "unsure")), open: num(open) })));
    box.appendChild(el("p", "hadith-note", t("The computer put these narrations together because they share words. The ones it is least sure about come first. The dua's own words are marked.")));
    const rest = btn(t("✓ Mark all the unchecked ones “same dua”"), "dua-ref", () => { members.forEach((m) => { if (!m.v) m.v = "same"; }); renderStep(); });
    rest.dataset.duaCheckRestSame = "true";
    box.appendChild(rest);
    const cut = members.filter((m) => m.v === "cut");
    if (cut.length) {
      const sb = el("div", "dua-check-split");
      sb.dataset.duaCheckSplit = "true";
      sb.appendChild(el("p", null, t("✂ {n} will leave Dua {dua}: {list}.", { n: num(cut.length), dua: num(dua), list: cut.map((m) => m.std || String(m.n)).join(", ") })));
      sb.appendChild(el("p", "hadith-note", t("Dua {dua} keeps its number and everyone's progress on it. A moved-out narration gets its own number at the next rebuild of the dua data.", { dua: num(dua) })));
      const row = el("div", "dua-check-verdict");
      const tg = btn(t("Put them together as one new dua"), "dua-ref", () => { together = true; renderStep(); });
      const ap = btn(t("Each one on its own"), "dua-ref", () => { together = false; renderStep(); });
      tg.dataset.duaCheckTogether = "true"; ap.dataset.duaCheckApart = "true";
      tg.setAttribute("aria-pressed", String(together)); ap.setAttribute("aria-pressed", String(!together));
      row.append(tg, ap);
      sb.appendChild(row);
      box.appendChild(sb);
    }
    const list = el("div", "dua-check-members");
    for (const m of members) {
      const row = el("div", "dua-check-member");
      row.dataset.duaCheckMember = m.key;
      if (m.v) row.dataset.v = m.v;
      const head = el("div", "dua-check-mhead");
      head.appendChild(el("span", "dua-check-src", `${books[m.b].short?.[getAppLang()] ?? books[m.b].short?.en ?? books[m.b].titleEn} ${m.number ?? m.std ?? m.n}`));
      const share = Number.isFinite(m.fit?.[0]) ? m.fit[0] : null;
      if (share != null) {
        const f = el("span", "dua-check-fit");
        const bar = el("span", "dua-check-bar"); const fill = el("i"); fill.style.width = `${Math.round(share * 100)}%`; bar.appendChild(fill);
        f.append(bar, el("span", null, t("{p}% of the dua's words", { p: num(Math.round(share * 100)) })));
        head.appendChild(f);
      }
      if (looksDifferent(m.fit)) { const w = el("span", "dua-check-chip dua-check-warn", t("⚠ looks different")); w.dataset.duaCheckDiff = "true"; head.appendChild(w); }
      if (m.isAnchor) head.appendChild(el("span", "dua-check-chip", t("the main narration")));
      row.appendChild(head);
      row.appendChild(m.text ? textWithMarks(m.text, own) : el("p", "hadith-note", t("Loading…")));
      m.textSlot = row.lastChild;
      row.appendChild(verdictBtns(m, [["same", t("✓ Same dua")], ...(m.isAnchor ? [] : [["cut", t("✂ A different dua")]]), ["unsure", t("? Not sure")]], renderStep));
      list.appendChild(row);
    }
    box.appendChild(list);
    return box;
  };

  const doubtLabel = (d) => d === "spelling" ? t("the Qur'an word is spelt differently") : d === "guess" ? t("no Qur'an word; a computer grammar guess") : t("not linked to anything");

  const renderWords = () => {
    const box = el("div", "dua-check-list");
    box.appendChild(el("p", "hadith-note dua-check-summary", t("Words: {total} · right {ok} · to fix {fix} · not checked yet {open} · the computer is unsure about {doubt}",
      { total: num(wordRows.length), ok: num(count(wordRows, (w) => w.v === "ok")), fix: num(count(wordRows, (w) => w.v === "fix")), open: num(count(wordRows, (w) => !w.v)), doubt: num(count(wordRows, (w) => w.doubt)) })));
    box.appendChild(el("p", "hadith-note", t("Each word as the dua card shows it, with what the computer linked it to. Words it is unsure about come first.")));
    const rest = btn(t("✓ Mark all the unchecked words right"), "dua-ref", () => { wordRows.forEach((w) => { if (!w.v) w.v = "ok"; }); renderStep(); });
    rest.dataset.duaCheckRestOk = "true";
    box.appendChild(rest);
    const list = el("div", "dua-check-words");
    for (const w of wordOrder(wordRows)) {
      const row = el("div", "dua-check-word");
      row.dataset.duaCheckWord = String(w.i);
      if (w.v) row.dataset.v = w.v;
      const ar = el("span", "dua-check-ar", w.v === "fix" && w.fix ? w.fix : w.text);
      ar.lang = "ar"; ar.dir = "rtl";
      row.appendChild(ar);
      const info = el("div", "dua-check-winfo");
      const top = el("div", "dua-check-mhead");
      top.appendChild(el("span", "hadith-note", t("Word {n}", { n: num(w.i + 1) })));
      if (w.doubt) { const c = el("span", "dua-check-chip dua-check-warn", `⚠ ${doubtLabel(w.doubt)}`); c.dataset.duaCheckDoubt = w.doubt; top.appendChild(c); }
      info.appendChild(top);
      if (w.link && !(w.v === "fix" && w.unlink)) {
        const q = el("p", "hadith-note");
        q.append(t("Linked to Qur'an {place} · ", { place: w.link[0] }));
        const qa = el("span", null, w.link[2]); qa.lang = "ar"; qa.dir = "rtl";
        q.append(qa, ` · "${getAppLang() === "bn" ? w.link[5] : w.link[4]}" · ${t("{n} times in the Qur'an", { n: num(w.link[1]) })}`);
        info.appendChild(q);
      } else if (w.grammar) {
        info.appendChild(el("p", "hadith-note", t("Grammar guess: {lemma}, root {root}", { lemma: w.grammar[0], root: w.grammar[1] || "–" })));
      }
      info.appendChild(verdictBtns(w, [["ok", t("✓ Right")], ["fix", t("✎ Fix")]], () => { if (w.v === "fix" && !w.fix) w.fix = w.text; renderStep(); }));
      if (w.v === "fix") {
        const fb = el("div", "dua-check-fixbox");
        const lab = el("label", "hadith-note", t("The word with its right vowels"));
        const inp = el("input", "dua-check-input");
        inp.id = `duaCheckFix${w.i}`; lab.htmlFor = inp.id;
        inp.lang = "ar"; inp.dir = "rtl"; inp.value = w.fix;
        inp.dataset.duaCheckFix = String(w.i);
        inp.addEventListener("input", () => { w.fix = inp.value; ar.textContent = inp.value || w.text; });
        fb.append(lab, inp);
        if (w.link) {
          const nl = btn(t("Not this Qur'an word"), "dua-ref", () => { w.unlink = !w.unlink; renderStep(); });
          nl.dataset.duaCheckUnlink = String(w.i);
          nl.setAttribute("aria-pressed", String(w.unlink));
          fb.appendChild(nl);
        }
        info.appendChild(fb);
      }
      row.appendChild(info);
      list.appendChild(row);
    }
    box.appendChild(list);
    return box;
  };

  const renderSave = () => {
    const box = el("div", "dua-check-list");
    const check = buildCheck({ members, words: wordRows, together, originals });
    const cutN = count(members, (m) => m.v === "cut");
    const openM = count(members, (m) => !m.v || m.v === "unsure"), openW = count(wordRows, (w) => !w.v);
    const fixes = Object.keys(check.fix ?? {}).length;
    box.appendChild(el("p", "hadith-note dua-check-summary", check.done
      ? t("Ready. {kept} narrations stay in Dua {dua}, {cut} move out, {fixes} words fixed.", { kept: num(members.length - cutN), dua: num(dua), cut: num(cutN), fixes: num(fixes) })
      : t("Not finished: {m} narrations and {w} words still open. You can save part of a check and come back.", { m: num(openM), w: num(openW) })));
    const save = btn(check.done ? t("Save my check") : t("Save what I have so far"), "dua-ref dua-check-save", async () => {
      save.disabled = true;
      saveMsg.textContent = "";
      try { await onSave(buildCheck({ members, words: wordRows, together, originals })); }
      catch (err) { save.disabled = false; saveMsg.textContent = t("Not saved: {why}", { why: String(err?.message ?? err) }); }
    });
    save.dataset.duaCheckSave = check.done ? "done" : "partly";
    box.append(save, saveMsg);
    return box;
  };

  const steps = [[1, t("1 · Narrations"), renderMembers], [2, t("2 · Words"), renderWords], [3, t("3 · Save"), renderSave]];
  function renderStep() {
    tabs.replaceChildren(...steps.map(([n, label]) => {
      const b = btn(label, "dua-ref dua-check-tab", () => { step = n; renderStep(); });
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(n === step)); b.dataset.duaCheckStep = String(n);
      return b;
    }));
    stepBox.replaceChildren(steps.find(([n]) => n === step)[2]());
  }
  renderStep();
  panel.append(tabs, stepBox);

  // The narrations' own texts arrive after the panel opens; the verdicts keep working meanwhile.
  textsPromise?.then((texts) => {
    members.forEach((m) => { m.text = texts[m.idx] || ""; });
    if (step === 1) renderStep();
  }).catch(() => { members.forEach((m) => { if (m.textSlot?.isConnected) m.textSlot.textContent = t("This narration could not be loaded."); }); });
  return panel;
}
