// The Dua tab (decisions 87-92): one card per dua, and the books' own Dua chapters. Moved here unchanged from
// hadith-browser.js (PCF MSA J106, at the MSA Architect's request), so the Dua module's own page can mount the
// same code later; hadith-browser.js imports renderDua from here, and behaves exactly as before.
import { t, num } from "./i18n.js";
import { getAppLang, quranFontStack } from "./prefs.js";
import { duaWords, duaNarration, duaWordTokens, duaWordsFingerprint, duaGrammarPosLabel } from "./dua-words.js";
import { TRANSLATED_BOOKS } from "./hadith-translations.js";
import { STATUSES, statusLabel } from "./unit-keys.js";
import { loadOpenitiBookIndex, loadOpenitiConcordance, loadDuaIndex, loadDuaCardsSummary, loadDuaCardsPage, loadDuaWordLinks, loadDuaVowels, loadDuaWordGrammar, loadDuaFit } from "./openiti-corpus.js";
import { buildCheckPanel, loadMemberTexts, applyMembers, checkChipText, checkState } from "./dua-check.js";
import { plainMessageFor } from "./errors.js";
import { el, loadHadithStudyActions, openitiDisplayTitle, openitiArabicRowName, duaRefLabel, standardTranslationFolds, openitiTranslationFold } from "./hadith-shared-ui.js";

/**
 * Round H-DB4 (decision 87), the Dua tab, first cut: the Dua chapters of eleven books (research report §2), each
 * opening in the library with "← Back to Dua". The narrations of one dua are linked across books on each card.
 */
export function renderDua(body, state, render) {
  if (!state.dua) state.dua = { bookUri: null, mode: "duas", page: 1 };
  // Round H-DB5 (decision 88): two views of the same data -- one card per dua (the demo the Owner approved), and the
  // books' own Dua chapters (v09.119).
  const modes = el("div", "dua-modes");
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", t("Dua"));
  for (const [mode, label] of [["duas", t("Duas")], ["chapters", t("Dua chapters")]]) {
    const b = el("button", "dua-mode", label);
    b.type = "button";
    b.dataset.duaMode = mode;
    b.setAttribute("aria-pressed", String(state.dua.mode === mode));
    b.addEventListener("click", () => { state.dua.mode = mode; render(); });
    modes.appendChild(b);
  }
  body.appendChild(modes);
  if (state.dua.mode !== "chapters") { renderDuaCards(body, state, render); return; }
  const section = el("section", "dua-section");
  section.id = "duaSection";
  section.appendChild(el("h2", null, t("Dua — the Dua chapters of the Hadith books")));
  section.appendChild(el("p", "hadith-note", t("Each narration shows its standard number, a Bangla or English translation where HadeethEnc has one, and the other books that narrate the same dua.")));
  const list = el("div", "hadith-list");
  section.appendChild(list);
  body.appendChild(section);
  list.appendChild(el("p", "hadith-note", t("Loading…")));
  loadDuaIndex().then(async (dua) => {
    list.textContent = "";
    if (!state.dua.bookUri) {
      for (const b of dua.books) {
        const row = el("button", "hadith-row");
        row.dataset.duaBook = b.versionUri;
        const name = el("span", "hadith-row-name");
        const ar = el("span", "openiti-title-ar", b.titleAr); ar.lang = "ar"; ar.dir = "rtl";
        name.appendChild(ar);
        name.appendChild(document.createTextNode(` — ${b.titleEn}`));
        row.appendChild(name);
        row.appendChild(el("span", "hadith-row-meta", t("{n} narrations", { n: num(b.narrations) })));
        row.addEventListener("click", () => { state.dua.bookUri = b.versionUri; render(); });
        list.appendChild(row);
      }
      return;
    }
    const book = dua.books.find((b) => b.versionUri === state.dua.bookUri);
    const back = el("button", "hadeethenc-crumb", t("← All Dua books"));
    back.type = "button";
    back.dataset.duaBack = "true";
    back.addEventListener("click", () => { state.dua.bookUri = null; render(); });
    list.appendChild(back);
    list.appendChild(el("h3", "hadith-row-name", book.titleEn));
    const index = await loadOpenitiBookIndex(book.versionUri);
    for (const id of book.chapterIds) {
      const c = index.chapters.find((x) => x.id === id);
      if (!c) continue;
      const row = el("button", "hadith-row");
      row.dataset.duaChapter = id;
      row.appendChild(openitiArabicRowName(openitiDisplayTitle(c.title)));
      row.appendChild(el("span", "hadith-row-meta", t("{n} narrations", { n: num(c.hadithCount || c.passageCount) })));
      row.addEventListener("click", () => {
        state.view = "books"; // PCF MSA J106: the library is now Hadith Books
        state.editionId = null;
        state.oi = { bookUri: book.versionUri, chapterId: id, books: null, showAllChapters: false,
          scrollTo: true, trail: [{ label: t("← Back to Dua"), toDua: () => { state.view = "dua"; render(); } }] };
        render();
      });
      list.appendChild(row);
    }
  }).catch((err) => duaLoadFailed(list, render, err));
}

/**
 * MSA audit part 130 (F2): when Dua data cannot be loaded (offline, a dropped connection), the reader sees the app's one
 * plain read-failure sentence (errors.js, audit part 128) in their language and a Try again button, never the browser's
 * own English ("Failed to fetch"). A failed load is not kept (openiti-corpus.js drops it from its cache), so Try again
 * really asks again.
 */
export function duaLoadFailed(container, retry, err) {
  container.textContent = "";
  const box = el("div", "dua-load-failed");
  box.setAttribute("role", "status");
  box.dataset.duaLoadFailed = "true";
  box.appendChild(el("p", "hadith-note", plainMessageFor(err, { read: true })));
  const again = el("button", "dua-ref", t("Try again"));
  again.type = "button";
  again.dataset.duaRetry = "true";
  again.addEventListener("click", retry);
  box.appendChild(again);
  container.appendChild(box);
}

/**
 * Round H-DB5 (decision 88), the Duas view: one card per dua, most-narrated first, 40 to a page. Each card: its
 * number and the bab heading of its first standard-numbered narration, that narration's Arabic, HadeethEnc's
 * translation where it has the hadith, every place it is narrated (each opening in the library with a way back to
 * this page), and the reader's progress, saved ONCE per dua (dua:<n>).
 */
/**
 * The way back (decision 86) lands ON the card, and stays there: after the jump, the cards above it keep growing (their
 * progress rows fill in, the Quranic font arrives) and would push it off the screen. For a few seconds, whenever the
 * list changes size the card is centred again -- until the reader scrolls, taps or types themselves.
 */
export function keepCardInView(target, list, ms = 5000) {
  if (typeof ResizeObserver !== "function") return;
  let done = false;
  const stop = () => { if (done) return; done = true; ro.disconnect(); for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(ev, stop, true); };
  const ro = new ResizeObserver(() => { if (!done && target.isConnected) target.scrollIntoView({ block: "center" }); });
  ro.observe(list);
  for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(ev, stop, true);
  setTimeout(stop, ms);
}

/**
 * A bookmark knows a dua by its permanent number, not its page. Pages hold cardsPerFile cards "most narrated first", so
 * the number's own page is tried first, then every page in turn (a re-run of the index can reorder them); null if none.
 */
export async function findDuaPage(dua) {
  const summary = await loadDuaCardsSummary();
  const guess = Math.min(Math.max(1, Math.ceil(dua / summary.cardsPerFile)), summary.files);
  const order = [guess, ...Array.from({ length: summary.files }, (_, i) => i + 1).filter((p) => p !== guess)];
  for (const p of order) if ((await loadDuaCardsPage(p)).some((c) => c.dua === dua)) return p;
  return null;
}

export function renderDuaCards(body, state, render) {
  const section = el("section", "dua-section dua-cards");
  section.id = "duaCards";
  body.appendChild(section);
  section.appendChild(el("p", "hadith-note", t("Loading…")));
  if (state.dua.findPage) {
    state.dua.findPage = false;
    findDuaPage(state.dua.focusDua).then((p) => {
      if (p) { state.dua.page = p; render(); return; }
      section.textContent = "";
      section.appendChild(el("p", "hadith-note", t("Dua {n} was not found.", { n: num(state.dua.focusDua) })));
    }).catch((err) => duaLoadFailed(section, () => { state.dua.findPage = true; render(); }, err));
    return;
  }
  Promise.all([loadDuaCardsSummary(), loadDuaCardsPage(state.dua.page || 1), loadDuaWordLinks(state.dua.page || 1).catch(() => null),
    loadDuaVowels(state.dua.page || 1).catch(() => null), loadDuaWordGrammar(state.dua.page || 1).catch(() => null),
    loadDuaCheckEnv(state)]).then(([summary, cards, wordLinks, vowels, wordGrammar, checkEnv]) => {
    section.textContent = "";
    const page = state.dua.page || 1;
    const first = (page - 1) * summary.cardsPerFile + 1;
    section.appendChild(el("p", "hadith-note dua-cards-count", t("Duas {from}–{to} of {total}, most narrated first. Each dua's narrations were found by matching words and are still to be checked.",
      { from: num(first), to: num(first + cards.length - 1), total: num(summary.cards) })));
    const pager = () => {
      const nav = el("div", "dua-pager");
      const prev = el("button", "dua-ref", `‹ ${t("Previous")}`);
      prev.type = "button"; prev.disabled = page <= 1; prev.dataset.duaPrev = "true";
      prev.addEventListener("click", () => { state.dua.page = page - 1; render(); document.getElementById("duaCards")?.scrollIntoView({ block: "start" }); });
      const next = el("button", "dua-ref", `${t("Next")} ›`);
      next.type = "button"; next.disabled = page >= summary.files; next.dataset.duaNext = "true";
      next.addEventListener("click", () => { state.dua.page = page + 1; render(); document.getElementById("duaCards")?.scrollIntoView({ block: "start" }); });
      nav.append(prev, el("span", "hadith-note", t("Page {n} of {total}", { n: num(page), total: num(summary.files) })), next);
      return nav;
    };
    section.appendChild(pager());
    const list = el("div", "hadith-occurrences");
    section.appendChild(list);
    const progressRows = [];
    for (const c of cards) list.appendChild(duaCard(c, summary, state, render, progressRows, wordLinks, page, vowels, wordGrammar, checkEnv));
    section.appendChild(pager());
    let target = null;
    if (state.dua.focusDua != null) {
      target = list.querySelector(`[data-dua-card="${state.dua.focusDua}"]`);
      state.dua.focusDua = null;
      if (target) { target.classList.add("hadith-card-focused"); target.scrollIntoView({ block: "center" }); target.tabIndex = -1; target.focus({ preventScroll: true }); }
    }
    fillDuaProgress(progressRows);
    if (target) keepCardInView(target, list);
  }).catch((err) => duaLoadFailed(section, render, err));
}

/**
 * Decision 96 (Check a dua): the madrasah's checks and who may make one, read ONCE when the Dua tab first opens (never
 * at startup, I9) and kept on state.dua. null when nobody is signed in or the read failed -- the cards then show as
 * before, nothing breaks. env = { data, session, exists, checks }.
 */
export async function loadDuaCheckEnv(state) {
  if (state.dua.checkEnv !== undefined) return state.dua.checkEnv;
  try {
    const data = await import("./dua-check-data.js");
    const session = data.getDuaCheckSession();
    if (!session) return (state.dua.checkEnv = null);
    const { exists, checks } = await data.loadDuaChecks(session);
    return (state.dua.checkEnv = { data, session, exists, checks });
  } catch { return (state.dua.checkEnv = null); }
}

export function duaCard(c, summary, state, render, progressRows, wordLinks = null, page = 1, vowels = null, wordGrammar = null, checkEnv = null) {
  const check = checkEnv?.checks?.[c.dua] ?? null;
  const baseWords = [];
  const card = el("article", "hadith-card dua-card");
  card.dataset.duaCard = String(c.dua);
  const head = el("p", "hadith-card-head", t("Dua {n}", { n: num(c.dua) }));
  card.appendChild(head);
  if (c.heading) {
    const h = el("h3", "dua-card-heading", c.heading);
    h.lang = "ar"; h.dir = "rtl";
    card.appendChild(h);
  }
  const dua = { books: summary.books };
  const [ab, an, astd, anum] = c.anchor;
  card.appendChild(el("p", "openiti-standard-number", duaRefLabel(dua, summary.books[ab].versionUri, astd, an, anum)));
  // The Owner, 8 Oct 2026: "clean dua words on each card" and "For Dua, I want same Quranic font". The words are
  // picked out of the narration by dua-words.js (a suggestion until checked); the narration stays one tap away with
  // the words marked in it. Where none are picked out, the narration shows as before.
  const picked = duaWords(c.text);
  if (picked) {
    const words = el("p", "dua-words");
    words.lang = "ar"; words.dir = "rtl";
    words.dataset.duaWords = String(c.dua);
    words.style.fontFamily = quranFontStack();
    card.appendChild(words);
    card.appendChild(el("p", "dua-words-note", t("Words picked out by the computer · a person checks them")));
    // Decision 90, round 1: each word opens what the Qur'an's own data knows about the same spelling. The links file
    // is only used when it was built from these very words (its fingerprint), so a changed picker never mislinks.
    const links = wordLinks?.duas?.[c.dua];
    const linked = !!links && links.f === duaWordsFingerprint(picked.words);
    const gram = wordGrammar?.duas?.[c.dua];
    // Round 5a (decision 90): the same words with vowels, where a vowelled text holds this whole dua word for word.
    const vow = vowels?.duas?.[c.dua];
    const vowelled = !!vow && vow.f === duaWordsFingerprint(picked.words) && vow.v.length === duaWordTokens(picked.words).length ? vow : null;
    const panel = el("div", "dua-word-panel");
    panel.hidden = true;
    panel.dataset.duaWordPanel = String(c.dua);
    duaWordTokens(picked.words).forEach((tok, i) => {
      if (i) words.appendChild(document.createTextNode(" "));
      // Decision 96: a word fixed in a check shows its fixed vowels; "not this Qur'an word" shows it unlinked.
      const fixedTxt = typeof check?.fix?.[i] === "string" ? check.fix[i] : null;
      const unlinked = Array.isArray(check?.unlink) && check.unlink.includes(i);
      baseWords.push({ i, text: vowelled ? vowelled.v[i] : tok, link: linked && (links.w[i] ?? -1) >= 0 ? wordLinks.entries[links.w[i]] : null,
        grammar: linked && gram?.f === links.f ? gram?.g?.[i] ?? null : null });
      const span = el("span", "dua-word", fixedTxt ?? (vowelled ? vowelled.v[i] : tok));
      span.dataset.duaWord = String(i);
      span.dataset.plain = tok;
      if (fixedTxt) span.dataset.duaWordFixed = "true";
      if (vowelled || fixedTxt) span.dataset.vowelled = fixedTxt ?? vowelled.v[i];
      if (linked) {
        const idx = unlinked ? -1 : (links.w[i] ?? -1);
        span.setAttribute("role", "button");
        span.tabIndex = 0;
        span.setAttribute("aria-pressed", "false");
        if (idx >= 0) span.classList.add("dua-word-linked");
        const open = () => showDuaWord(panel, words, span, span.textContent, idx >= 0 ? wordLinks.entries[idx] : null, c.dua, page, links.x?.[i] ?? "", idx < 0 && gram?.f === links.f ? gram.g?.[i] ?? null : null, i);
        span.addEventListener("click", open);
        span.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
      }
      words.appendChild(span);
    });
    if (vowelled) {
      // Where the vowels come from, and a switch to see the words without them (one tap, both ways).
      const src = vowelled.s.startsWith("hisn:") ? t("Hisn al-Muslim") : t("HadeethEnc");
      const row = el("p", "dua-words-note dua-vowels-note");
      row.dataset.duaVowels = vowelled.s;
      row.appendChild(document.createTextNode(t("Vowels from {source}, matched word for word by the computer · a person checks them", { source: src })));
      const sw = el("button", "dua-ref dua-vowels-toggle", t("Without vowels"));
      sw.type = "button";
      sw.dataset.duaVowelsToggle = "";
      sw.setAttribute("aria-pressed", "false");
      sw.addEventListener("click", () => {
        const plain = sw.getAttribute("aria-pressed") !== "true";
        sw.setAttribute("aria-pressed", String(plain));
        sw.textContent = plain ? t("With vowels") : t("Without vowels");
        words.querySelectorAll("[data-dua-word]").forEach((w) => { w.textContent = plain ? w.dataset.plain : w.dataset.vowelled; });
      });
      row.appendChild(sw);
      card.appendChild(row);
    }
    if (linked) card.appendChild(el("p", "dua-words-note dua-words-tap", t("Tap a word to see it in the Qur'an's words.")));
    card.appendChild(panel);
    const fold = document.createElement("details");
    fold.className = "dua-narration";
    fold.dataset.duaNarration = String(c.dua);
    const sum = document.createElement("summary");
    sum.textContent = t("The whole narration");
    fold.appendChild(sum);
    const full = duaNarration(c.text);
    const text = el("p", "hadith-arabic");
    text.lang = "ar"; text.dir = "rtl";
    const mark = document.createElement("mark");
    mark.className = "dua-words-mark";
    mark.textContent = full.slice(picked.start, picked.end);
    text.append(full.slice(0, picked.start), mark, full.slice(picked.end));
    fold.appendChild(text);
    card.appendChild(fold);
  } else {
    const text = el("p", "hadith-arabic", c.text);
    text.lang = "ar"; text.dir = "rtl";
    card.appendChild(text);
    card.appendChild(el("p", "dua-words-note", t("The dua's own words are not picked out of this narration yet.")));
  }
  if (c.hadeethenc?.length) card.appendChild(openitiTranslationFold(c.hadeethenc.map(String)));
  const anchorUri = summary.books[ab].versionUri;
  if (TRANSLATED_BOOKS.has(anchorUri)) card.appendChild(standardTranslationFolds(anchorUri, () => loadOpenitiConcordance(anchorUri).then((cc) => cc?.stdByN?.get(an) ?? null).catch(() => null)));

  const box = el("div", "dua-also");
  // Decision 96: members a check moved out are left out of the count and listed below it.
  const { kept, movedOut } = applyMembers(c.members, c.anchor, summary.books, check);
  const headP = el("p", "dua-also-head", t("Narrated in {n} places", { n: num(kept.length) }));
  headP.dataset.duaNarratedCount = String(kept.length);
  const chipText = checkChipText(check);
  const chip = el("span", chipText ? `dua-check-chip dua-check-${checkState(check)}` : "dua-proposed", chipText ?? t("found by matching words, to be checked"));
  chip.dataset.duaCheckStatus = checkState(check);
  headP.appendChild(chip);
  box.appendChild(headP);
  const mainRow = el("div", "dua-also-refs");
  const restRow = el("div", "dua-also-refs");
  const btn = ([b, n, std, number]) => {
    const versionUri = summary.books[b].versionUri;
    const r = el("button", "dua-ref", duaRefLabel(dua, versionUri, std, n, number));
    r.type = "button";
    r.dataset.duaRef = `${versionUri}:${n}`;
    r.addEventListener("click", () => {
      state.view = "books"; // PCF MSA J106: the library is now Hadith Books
      state.editionId = null;
      const page = state.dua.page;
      state.oi = { bookUri: versionUri, chapterId: null, books: null, showAllChapters: false, focusPassage: n,
        trail: [{ label: t("← Back to Dua {n}", { n: num(c.dua) }), toDua: () => { state.view = "dua"; state.dua.mode = "duas"; state.dua.page = page; state.dua.focusDua = c.dua; render(); } }] };
      render();
    });
    return r;
  };
  const withStd = kept.filter((m) => m[2] != null && m[2] !== "");
  const rest = kept.filter((m) => !(m[2] != null && m[2] !== ""));
  for (const m of withStd) mainRow.appendChild(btn(m));
  if (withStd.length) box.appendChild(mainRow);
  if (rest.length && !withStd.length) { for (const m of rest) mainRow.appendChild(btn(m)); box.appendChild(mainRow); }
  else if (rest.length) {
    const more = document.createElement("details");
    more.className = "dua-also-more";
    const sum = document.createElement("summary");
    sum.textContent = t("+{n} more in other books", { n: num(rest.length) });
    more.appendChild(sum);
    for (const m of rest) restRow.appendChild(btn(m));
    more.appendChild(restRow);
    box.appendChild(more);
  }
  if (movedOut.length) {
    const mv = el("div", "dua-also dua-check-moved");
    mv.dataset.duaMovedOut = String(movedOut.length);
    mv.appendChild(el("p", "dua-also-head", t("Moved out, new number coming ({n})", { n: num(movedOut.length) })));
    const mvRow = el("div", "dua-also-refs");
    for (const m of movedOut) mvRow.appendChild(btn(m));
    mv.appendChild(mvRow);
    box.appendChild(mv);
  }
  card.appendChild(box);
  if (checkEnv?.session?.canCheck) card.appendChild(duaCheckButton(card, c, summary, state, render, page, checkEnv, check, baseWords));

  const prog = el("div", "dua-progress");
  prog.dataset.duaProgress = String(c.dua);
  prog.appendChild(el("p", "dua-also-head", t("My progress on this dua")));
  prog.appendChild(el("p", "hadith-note", t("Loading…")));
  card.appendChild(prog);
  progressRows.push({ dua: c.dua, el: prog, page });
  return card;
}

/**
 * Decision 96: "✓ Check this dua" -- only for Owner and Prime (a non-admin preview gets no button, the status chip
 * still shows). It opens the check panel under the card; ← Back closes it and returns focus to the card. Saving writes
 * duaChecks.<dua> alone, patches the in-memory copy and redraws the page on this card.
 */
export function duaCheckButton(card, c, summary, state, render, page, env, check, baseWords) {
  const open = el("button", "dua-ref dua-check-open", check ? t("✓ Check this dua again") : t("✓ Check this dua"));
  open.type = "button";
  open.dataset.duaCheckOpen = String(c.dua);
  open.addEventListener("click", () => {
    if (card.nextElementSibling?.classList.contains("dua-check-host")) return;
    const fit = loadDuaFit(page).then((f) => f?.duas?.[c.dua] ?? null).catch(() => null);
    const panelHost = el("div", "dua-check-host");
    card.after(panelHost);
    const close = () => { panelHost.remove(); card.tabIndex = -1; card.focus({ preventScroll: true }); card.scrollIntoView({ block: "center" }); };
    fit.then((fitRows) => {
      const texts = loadMemberTexts(c, summary.books);
      panelHost.appendChild(buildCheckPanel({
        card: c, books: summary.books, fit: fitRows, words: baseWords, existing: check, textsPromise: texts, onBack: close,
        onSave: async (made) => {
          const stored = await env.data.saveDuaCheck(env.session, c.dua, made, env.exists);
          env.exists = true; env.checks[c.dua] = stored;
          state.dua.focusDua = c.dua;
          render();
        },
      }));
      panelHost.firstChild.scrollIntoView({ block: "start" });
    });
  });
  const row = el("div", "dua-check-row");
  row.appendChild(open);
  return row;
}

/** Decision 90, rounds 3-4: "S:A:W" from a packed place (surah*1000000 + ayah*1000 + word). */
export function placeOf(n) { return `${Math.floor(n / 1000000)}:${Math.floor(n / 1000) % 1000}:${n % 1000}`; }

/**
 * The way to a Qur'an word's Word card from a Dua card (decision 86): this page's address is first set to reopen this
 * page of Duas on this card, so the Word card's "Back to Dua n" (history.back) lands here. `progress` (round 4) asks
 * the Word card to record that Word-by-Word state for the word on arrival -- with a one-use token in this tab's
 * sessionStorage, so the address alone can never record anything.
 */
export function wordCardHref(place, dua) { return `./quranrevival.html?word=${place}&back=1&from=dua-${dua}`; }
export function rememberDuaPlace(page, dua) {
  try {
    const u = new URL(location.href);
    u.searchParams.set("view", "dua"); u.searchParams.set("duaPage", String(page)); u.searchParams.set("dua", String(dua));
    history.replaceState(history.state, "", u);
  } catch { /* the link still opens the Word card */ }
}
export const DUA_WORD_PROGRESS_TOKEN = "mmsa-dua-word-progress";
const WBW_STATES = ["not_started", "learning", "practising", "achieved"];

/**
 * Round 5b (decision 91): the computer's grammar suggestion for a word no Qur'an word is spelled like -- dictionary
 * word, root, part of speech, and the two dictionaries opened at the root. g = [lemma, root, pos, vowelled].
 */
export function duaGrammarBlock([lemma, root, pos]) {
  const box = el("div", "dua-word-grammar");
  box.dataset.duaWordGrammar = "";
  box.appendChild(el("p", "dua-also-head", t("Grammar suggestion (computer, to be checked)")));
  const line = (label, value, cls, ar) => {
    const p = el("p", `dua-word-line ${cls}`);
    p.appendChild(el("span", "dua-word-label", label));
    const v = el("span", "dua-word-value", value);
    if (ar) { v.lang = "ar"; v.dir = "rtl"; v.style.fontFamily = quranFontStack(); }
    p.appendChild(v);
    return p;
  };
  if (lemma) box.appendChild(line(t("Dictionary word"), lemma, "dua-word-lemma", true));
  if (root) box.appendChild(line(t("Root"), root, "dua-word-root", true));
  if (pos) box.appendChild(line(t("Part of speech"), t(duaGrammarPosLabel(pos)), "dua-word-pos", false));
  if (root) {
    const dict = el("div", "dua-word-dicts");
    dict.dataset.duaWordDicts = "";
    box.appendChild(dict);
    Promise.all([import("./quran-word-card.js"), import("./buckwalter.js")]).then(([wc, bw]) => {
      const links = [[t("Quranic Arabic Corpus"), `https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(bw.arabicToBuckwalter(root))}`, "corpus"],
        [t("Lane · Hans Wehr"), wc.ejtaalUrl(root), "ejtaal"]];
      for (const [label, href, kind] of links) {
        if (!href) continue;
        const a = el("a", "dua-ref dua-word-dict", `${label} ↗`);
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.dataset.duaWordDict = kind;
        dict.appendChild(a);
      }
    }).catch(() => dict.remove());
  }
  return box;
}

/**
 * Decision 90, rounds 1-4: the Dua word card under a dua's words, for the word tapped. `entry` is the links file's
 * row [place, count, arabic, translit, en, bn, root, lemma, lemmaCount, wbwKey, places], or null when no Qur'an word
 * is spelled this way; `how` says a leading «و»/«ف» was set aside and/or the Qur'an's own spelling was used (round
 * 2). Round 3: the card on this page -- meanings, root, dictionary word, dictionary links, its places in the Qur'an.
 * Round 4 (Q1 answered yes): "Achieved" here counts for the same Qur'an word. Tapping the same word again closes it.
 */
export function showDuaWord(panel, words, span, tok, entry, dua, page, how = "", grammar = null, pos = null) {
  const wasOpen = span.getAttribute("aria-pressed") === "true";
  words.querySelectorAll(".dua-word[aria-pressed]").forEach((s) => s.setAttribute("aria-pressed", "false"));
  panel.textContent = "";
  if (wasOpen) { panel.hidden = true; return; }
  span.setAttribute("aria-pressed", "true");
  panel.hidden = false;
  const head = el("div", "dua-word-panel-head");
  const ar = el("span", "dua-word-panel-ar", tok);
  ar.lang = "ar"; ar.dir = "rtl"; ar.style.fontFamily = quranFontStack();
  const close = el("button", "dua-word-panel-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", t("Close"));
  close.addEventListener("click", () => { span.setAttribute("aria-pressed", "false"); panel.hidden = true; span.focus({ preventScroll: true }); });
  head.append(ar, close);
  panel.appendChild(head);
  if (!entry) {
    panel.appendChild(el("p", "hadith-note", t("No word of the Qur'an is spelled this way, so it is not linked yet.")));
    if (grammar) panel.appendChild(duaGrammarBlock(grammar));
    if (pos != null) panel.appendChild(duaWordProgressBlock({ dua, pos, page }));
    return;
  }
  const [place, count, qar, tr, en, bn, root, lemma, lemmaCount, wbwKey, places = []] = entry;
  const line = (label, value, cls = "", lang = "") => {
    const p = el("p", `dua-word-line ${cls}`.trim());
    p.appendChild(el("span", "dua-word-label", label));
    const v = el("span", "dua-word-value", value);
    if (lang) { v.lang = lang; if (lang === "ar") { v.dir = "rtl"; v.style.fontFamily = quranFontStack(); } }
    p.appendChild(v);
    return p;
  };
  panel.appendChild(line(t("In the Qur'an"), qar, "dua-word-quran", "ar"));
  // Round 2: how the dua's word met the Qur'an's.
  const prefix = how.replace("~", "");
  if (prefix) panel.appendChild(el("p", "dua-word-how", prefix === "\u0648" ? t("Read as «و» (and) + this word") : t("Read as «ف» (so) + this word")));
  if (how.includes("~")) panel.appendChild(el("p", "dua-word-how", t("The Qur'an spells this word its own way")));
  if (tr) panel.appendChild(line(t("Sounds like"), tr, "dua-word-translit"));
  const means = getAppLang() === "bn" ? [[bn, "bn"], [en, "en"]] : [[en, "en"], [bn, "bn"]];
  for (const [m, l] of means) if (m) panel.appendChild(line(l === "bn" ? t("Meaning (Bangla)") : t("Meaning (English)"), m, `dua-word-meaning-${l}`, l));
  if (root) panel.appendChild(line(t("Root"), root, "dua-word-root", "ar"));
  if (lemma) {
    const p = line(t("Dictionary word"), lemma, "dua-word-lemma", "ar");
    if (lemmaCount > 1) p.appendChild(el("span", "dua-proposed", t("one of {n} possible, to be checked", { n: num(lemmaCount) })));
    panel.appendChild(p);
  }
  // Round 3: the dictionaries, opened at the root (the Word card's own links, loaded on first use).
  if (root) {
    const dict = el("div", "dua-word-dicts");
    dict.dataset.duaWordDicts = "";
    panel.appendChild(dict);
    Promise.all([import("./quran-word-card.js"), import("./buckwalter.js")]).then(([wc, bw]) => {
      const links = [[t("Quranic Arabic Corpus"), `https://corpus.quran.com/qurandictionary.jsp?q=${encodeURIComponent(bw.arabicToBuckwalter(root))}`, "corpus"],
        [t("Lane · Hans Wehr"), wc.ejtaalUrl(root), "ejtaal"]];
      for (const [label, href, kind] of links) {
        if (!href) continue;
        const a = el("a", "dua-ref dua-word-dict", `${label} ↗`);
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.dataset.duaWordDict = kind;
        dict.appendChild(a);
      }
    }).catch(() => dict.remove());
  }
  // Round 3: where the word is in the Qur'an -- each place opens its Word card, with the way back.
  panel.appendChild(el("p", "dua-word-count", t("{n} times in the Qur'an, spelled this way", { n: num(count) })));
  if (places.length) {
    const row = el("div", "dua-word-places");
    for (const n of places) {
      const ref = placeOf(n);
      const a = el("a", "dua-ref dua-word-place", num(ref));
      a.href = wordCardHref(ref, dua);
      a.dataset.duaWordPlace = ref;
      a.addEventListener("click", () => rememberDuaPlace(page, dua));
      row.appendChild(a);
    }
    if (count > places.length) row.appendChild(el("span", "hadith-note", t("+{n} more in the Word card", { n: num(count - places.length) })));
    panel.appendChild(row);
  }
  const go = el("a", "dua-ref dua-word-open", `${t("Open in the Word card")} ›`);
  go.dataset.duaWordOpen = place;
  go.href = wordCardHref(place, dua);
  go.addEventListener("click", () => rememberDuaPlace(page, dua));
  panel.appendChild(go);
  if (pos != null) panel.appendChild(duaWordProgressBlock({ dua, pos, page, place, wbwKey }));
  panel.appendChild(el("p", "dua-words-note", t("Linked by the computer by spelling · to be checked")));
}

/**
 * Decision 92, round 6 ("Go ahead with round 6"): progress on this word IN THIS DUA, its own record
 * (duaword:<dua>:<position>, position counted from 1), saved here at once. For a word linked to the Qur'an (round 4,
 * decision 90 Q1 = yes) the same press then opens the Word card to count it for the same Qur'an word, through the Word
 * card's own saving, with a one-use token. A failed save says so and opens nothing (I15).
 */
export function duaWordProgressBlock({ dua, pos, page, place = null, wbwKey = "" }) {
  const position = pos + 1;
  const prog = el("div", "dua-word-progress");
  prog.dataset.duaWordProgress = wbwKey;
  prog.dataset.duaWordPosition = String(position);
  prog.appendChild(el("p", "dua-also-head", t("My progress on this word")));
  const here = el("p", "hadith-note dua-word-progress-dua", t("Loading…"));
  prog.appendChild(here);
  const quran = wbwKey ? el("p", "hadith-note dua-word-progress-now", "") : null;
  if (quran) prog.appendChild(quran);
  const row = el("div", "dua-progress-row");
  const msg = el("p", "hadeethenc-study-reason");
  msg.setAttribute("role", "status");
  let session = null, actions = null, current = null;
  const paint = () => row.querySelectorAll("[data-dua-word-state]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.duaWordState === (current ?? "not_started"))));
  for (const id of WBW_STATES) {
    const b = el("button", "dua-status", statusLabel(id));
    b.type = "button";
    b.dataset.duaWordState = id;
    b.addEventListener("click", async () => {
      msg.textContent = "";
      if (!session) { msg.textContent = t("Sign in and choose who you're studying as to record progress."); return; }
      if (!session.canRecordFor) { msg.textContent = t("You can view this, but only the person's own record can record progress."); return; }
      const before = current;
      current = id; paint();
      here.textContent = t("In this dua: {state}", { state: statusLabel(id) });
      try { await actions.claimDuaWord(session, dua, position, id); }
      catch (err) { current = before; paint(); here.textContent = t("In this dua: {state}", { state: statusLabel(before ?? "not_started") }); msg.textContent = t("Not saved: {why}", { why: String(err?.message ?? err) }); return; }
      here.dataset.duaWordDuaStateNow = id;
      if (wbwKey) {
        rememberDuaPlace(page, dua);
        try { sessionStorage.setItem(DUA_WORD_PROGRESS_TOKEN, `${place}|${id}`); } catch { /* the Word card opens without recording */ }
        location.href = `${wordCardHref(place, dua)}&progress=${id}`;
      }
    });
    row.appendChild(b);
  }
  prog.appendChild(row);
  prog.appendChild(msg);
  prog.appendChild(el("p", "dua-words-note", wbwKey
    ? t("Saved for this word in this dua; the Word card then opens to count it for the same word in the Qur'an too.")
    : t("Saved for this word in this dua.")));
  loadHadithStudyActions().then(async (a) => {
    actions = a;
    session = await a.getHadeethEncSession();
    if (!session) { here.textContent = t("Sign in and choose who you're studying as to record progress."); return; }
    const [mine, q] = await Promise.all([a.duaWordStatuses(session, dua), wbwKey ? a.duaWordProgress(session, wbwKey) : null]);
    current = mine.get(position) ?? null;
    here.textContent = t("In this dua: {state}", { state: statusLabel(current ?? "not_started") });
    here.dataset.duaWordDuaStateNow = current ?? "not_started";
    if (quran) { quran.textContent = t("The same word in the Qur'an (Word-by-Word): {state}", { state: statusLabel(q) }); quran.dataset.duaWordStateNow = q; }
    paint();
  }).catch(() => { here.textContent = t("Progress could not be loaded right now."); });
  return prog;
}

/** The progress rows of one page: one session, one read of the person's statuses, then a row of status buttons each. */
export async function fillDuaProgress(rows) {
  const say = (msg) => rows.forEach(({ el: p }) => { p.lastChild.remove(); p.appendChild(el("p", "hadeethenc-study-reason", msg)); });
  let actions, session = null;
  try { actions = await loadHadithStudyActions(); session = await actions.getHadeethEncSession(); }
  catch { say(t("Progress could not be loaded right now.")); return; }
  if (!session) { say(t("Sign in and choose who you're studying as to record progress.")); return; }
  if (!session.canRecordFor) { say(t("You can view this, but only the person's own record can record progress.")); return; }
  let statuses = new Map();
  try { statuses = await actions.duaStatuses(session); } catch { say(t("Progress could not be loaded right now.")); return; }
  let bookmarked = new Set();
  try { bookmarked = await actions.duaBookmarkedSet(session); } catch { /* the buttons still toggle; a read hiccup is not a write (I15) */ }
  const onRamp = STATUSES.filter((s) => s.onRamp);
  for (const { dua, el: p, page } of rows) {
    p.lastChild.remove();
    const row = el("div", "dua-progress-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", t("My progress on this dua"));
    const msg = el("p", "hadeethenc-study-reason");
    msg.setAttribute("role", "status");
    let current = statuses.get(dua) ?? null;
    const paint = () => row.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.duaStatus === (current ?? "not_started"))));
    for (const s of onRamp) {
      const b = el("button", "dua-status", statusLabel(s.id));
      b.type = "button";
      b.dataset.duaStatus = s.id;
      b.addEventListener("click", async () => {
        const before = current;
        current = s.id; paint(); msg.textContent = "";
        try { await actions.claimDua(session, dua, s.id); }
        catch (err) { current = before; paint(); msg.textContent = t("Not saved: {why}", { why: String(err?.message ?? err) }); }
      });
      row.appendChild(b);
    }
    paint();
    p.append(row, msg, duaNoteBookmarkRow(actions, session, dua, page, bookmarked.has(dua)));
  }
}

/**
 * 9 Oct 2026: 📝 My Notes and 🔖 Bookmark on a dua card, the same pair (and look) a HadeethEnc hadith card has. Notes
 * open notes.html for dua:<n> with ← Back (this page's address is first set to reopen this card); the bookmark reopens
 * this card from the Bookmarks page (?resume=dua:<n>). Only the person's own record writes a Note.
 */
export function duaNoteBookmarkRow(actions, session, dua, page, isBookmarked) {
  const box = el("div", "hadeethenc-study-row dua-note-bookmark");
  box.dataset.duaNoteBookmark = String(dua);
  const name = t("Dua {n}", { n: num(dua) });
  const noteItem = el("div", "hadeethenc-study-item");
  const note = document.createElement("a");
  note.className = "hadeethenc-study-btn";
  note.href = actions.duaNoteHrefFor(dua, name);
  note.dataset.duaNoteLink = String(dua);
  note.textContent = `📝 ${t("My Notes")}`;
  note.setAttribute("aria-disabled", session.isSelf ? "false" : "true");
  note.addEventListener("click", (e) => { if (!session.isSelf) { e.preventDefault(); return; } rememberDuaPlace(page, dua); });
  noteItem.appendChild(note);
  if (!session.isSelf) noteItem.appendChild(el("p", "hadeethenc-study-reason", t("Only your own record can create or file a Note.")));
  const markItem = el("div", "hadeethenc-study-item");
  const mark = el("button", "hadeethenc-study-btn");
  mark.type = "button";
  mark.dataset.duaBookmark = String(dua);
  const msg = el("p", "hadeethenc-study-reason");
  msg.setAttribute("role", "status");
  let on = isBookmarked;
  const paint = () => { mark.textContent = on ? `★ ${t("Remove bookmark")}` : `🔖 ${t("Bookmark this")}`; mark.setAttribute("aria-pressed", String(on)); };
  paint();
  mark.addEventListener("click", async () => {
    if (mark.getAttribute("aria-disabled") === "true") return;
    mark.setAttribute("aria-disabled", "true");
    msg.textContent = "";
    try { on = await actions.toggleDuaBookmark(session, dua, name); }
    catch (err) { msg.textContent = t("Not saved: {why}", { why: String(err?.message ?? err) }); }
    mark.setAttribute("aria-disabled", "false");
    paint();
  });
  markItem.append(mark, msg);
  box.append(noteItem, markItem);
  return box;
}
