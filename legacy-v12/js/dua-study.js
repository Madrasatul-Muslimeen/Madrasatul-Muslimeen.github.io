// The Dua module's own page (PCF MSA J104; docs/governance/dua-module-plan.md), build round R1:
//   D19 the page (app/dua-study.html mounts this),
//   D01 the seven Dua groups, D21 the groups and a group's parts as pull-down menus,
//   D02 numbers in every group, in the group's own order,
//   D04 every Dua opens in its Dua Card, with ‹ › through its group and ← Back to the group.
// Build round R2:
//   D22 on the Dua Card only the Dua itself and the progress stay open; every other block (meaning, source, the whole
//       narration, ✓ Check) opens from the card's menu as a pop-up card with ✕ back to the Dua,
//   D11 the Asma ul Husna poster's bottom banner under every Dua Card, D12 a top banner frame above it,
//   D05 a title for every Dua that has one (groups.json `titles`, English and Bangla), until D03 can save titles.
// The re-layout is done here, around the card Hadith Study's Dua tab also uses, so that tab is unchanged.
// Build round R3: D07 the poster and D14 copy / share, both from the card's menu (dua-poster.js draws them from the
// "sheet" each card hands over here).
// The groups come from tools/hadith-data-pull/output/dua/groups.json (dua-groups.mjs), read when this page opens, never
// at the app's startup (I9). A Dua from the Hadith books opens the same Dua card as Hadith Study's Dua tab (duaCard in
// dua-browser.js), with its progress, notes, bookmark and checks. Where the reader is (group, part, list page, open
// Dua) is kept in this page's address, so every way back (decision 86) lands exactly here.
import { t, num } from "./i18n.js";
import { getAppLang, quranFontStack } from "./prefs.js";
import { loadDuaCardsSummary, loadDuaCardsPage, loadDuaWordLinks, loadDuaVowels, loadDuaWordGrammar } from "./openiti-corpus.js";
import { duaCard, duaLoadFailed, fillDuaProgress, loadDuaCheckEnv } from "./dua-browser.js";
import { el } from "./hadith-shared-ui.js";
import { duaWords, duaWordsFingerprint } from "./dua-words.js";
import { posterNodes, shareNodes } from "./dua-poster.js";

const GROUPS_URL = "../tools/hadith-data-pull/output/dua/groups.json";
const BANNER_URL = "./img/dua-banner-bottom.webp";
export const PER_PAGE = 50;
export const GROUP_IDS = ["occasions", "books", "prophets", "rasul", "sahaba", "salaf", "ulama"];

// D01: the seven groups' names. "Rasulullah" is always followed by "Sallallahu A'laihi Wa Sallam" (saw128).
export function groupName(id) {
  return ({
    occasions: t("Dua by Occasions"), books: t("Dua by Hadith Books"), prophets: t("Dua of Prophets"),
    rasul: t("Dua of Rasulullah Sallallahu A'laihi Wa Sallam"), sahaba: t("Dua of the Sahaba"), salaf: t("Dua of the Salaf"),
    ulama: t("Dua of the Ulama"),
  })[id];
}
const EMPTY = {
  sahaba: () => t("No duas here yet. Each one needs a checked source: which Companion said it, and the book that reports it."),
  salaf: () => t("No duas here yet. Each one needs a checked source, for example an-Nawawi's al-Adhkār."),
  ulama: () => t("No duas here yet. Each one needs the scholar's name and the book it is from."),
};

let groupsPromise = null;
/** The groups file, read once; a failed read is not kept, so Try again really asks again. */
export function loadDuaGroups({ fetchImpl = fetch, url = GROUPS_URL } = {}) {
  if (!groupsPromise) {
    groupsPromise = fetchImpl(url).then(async (res) => {
      if (!res.ok) throw new Error(`Could not load the Dua groups (${res.status}).`);
      return buildDuaGroups(await res.json());
    });
    groupsPromise.catch(() => { groupsPromise = null; });
  }
  return groupsPromise;
}

/** Pure: the file -> { groups: Map(id -> group), duaRow: Map(n -> [n, page, places, line]) }, every list as entries. */
export function buildDuaGroups(data) {
  if (!Array.isArray(data?.duas) || !Array.isArray(data?.groups)) throw new Error("Invalid Dua groups shape.");
  const duaRow = new Map(data.duas.map((r) => [r[0], r]));
  const groups = new Map();
  for (const g of data.groups) {
    const entries = (items, kind) => items.map((x) => (kind === "dua" ? { kind, n: x[0], std: x[1] ?? null } : { kind, ...x }));
    if (g.id === "occasions") groups.set(g.id, { id: g.id, parts: g.parts.map((p) => ({ id: p.id, en: p.en, bn: p.bn, items: entries(p.items, "hisn") })) });
    else if (g.id === "books") groups.set(g.id, { id: g.id, parts: g.parts.map((p) => ({ id: p.id, en: p.en, bn: p.bn, ar: p.ar, short: p.short, items: entries(p.items, "dua") })) });
    else if (g.id === "rasul") groups.set(g.id, { id: g.id, items: data.duas.map((r) => ({ kind: "dua", n: r[0] })) });
    else if (g.id === "prophets") groups.set(g.id, { id: g.id, items: entries(g.items, "quran") });
    else groups.set(g.id, { id: g.id, items: entries(g.items, "dua") });
  }
  for (const id of GROUP_IDS) if (!groups.has(id)) throw new Error(`Dua group ${id} is missing.`);
  return { groups, duaRow, titles: data.titles ?? {}, credits: data.credits ?? [] };
}

const partName = (p) => (getAppLang() === "bn" && p.bn) || p.en;

/**
 * Pure (D05): a list entry's title in the reader's language -- { text, ar } -- or null. Bangla falls back to English;
 * with neither, a Hisn dhikr's chapter or a Hadith dua's book chapter heading stands in, in Arabic (ar: true).
 */
export function titleOf(data, e, lang = getAppLang()) {
  const pick = (tt) => (tt ? (lang === "bn" && tt.bn) || tt.en || null : null);
  if (e.kind === "quran") { const x = pick(e.title); return x ? { text: x, ar: false } : null; }
  if (e.kind === "hisn") { const x = pick(e.title); return x ? { text: x, ar: false } : e.chapter ? { text: e.chapter, ar: true } : null; }
  const x = pick(data.titles?.[e.n]);
  if (x) return { text: x, ar: false };
  const line = data.duaRow?.get(e.n)?.[3];
  return Array.isArray(line) ? { text: line[0], ar: true } : null;
}
/** The list a place names: a part's items, a group's items, or null (a group with parts, none chosen). */
export function listOf(data, where) {
  const g = data.groups.get(where.g);
  if (!g) return null;
  if (g.parts) return g.parts.find((p) => p.id === where.part)?.items ?? null;
  return g.items;
}
// A group's count counts each dua once: one dua narrated in three books is one dua of "Dua by Hadith Books".
const keyOf = (e) => (e.kind === "dua" ? `d${e.n}` : e.kind === "hisn" ? `h${e.h}` : `q${e.ref}`);
const countOf = (g) => (g.parts ? new Set(g.parts.flatMap((p) => p.items.map(keyOf))).size : g.items.length);

/** Where the reader is, read from and written to this page's address. */
export function readPlace(search) {
  const q = new URLSearchParams(search);
  const g = GROUP_IDS.includes(q.get("g")) ? q.get("g") : "rasul";
  const part = q.get("part") || null;
  const lp = Math.max(1, Number.parseInt(q.get("lp"), 10) || 1);
  const open = /^\d{1,5}$/.test(q.get("open") ?? "") ? Number(q.get("open")) : null;
  // Decision 90's way back from a dua word's Word card: ?view=dua&dua=<n> reopens that Dua's card.
  // D06 (round R4): a Dua bookmark, or the Continue strip, opens ?resume=dua:<n> -- the same Dua's card.
  const resume = /^dua:(\d{1,5})$/.exec(q.get("resume") ?? "");
  const dua = q.get("view") === "dua" && /^\d{1,5}$/.test(q.get("dua") ?? "") ? Number(q.get("dua")) : resume ? Number(resume[1]) : null;
  // A Hisn dhikr's tied Dua card, opened from that dhikr (open names the dhikr).
  const tie = /^\d{1,5}$/.test(q.get("tie") ?? "") ? Number(q.get("tie")) : null;
  return { g, part, lp, open, dua, tie };
}
function writePlace(where) {
  try {
    const u = new URL(location.href);
    for (const k of ["g", "part", "lp", "open", "tie", "view", "duaPage", "dua", "resume"]) u.searchParams.delete(k);
    u.searchParams.set("g", where.g);
    if (where.part) u.searchParams.set("part", where.part);
    if (where.lp > 1) u.searchParams.set("lp", String(where.lp));
    if (where.open != null) u.searchParams.set("open", String(where.open));
    if (where.tie != null) u.searchParams.set("tie", String(where.tie));
    history.replaceState(history.state, "", u);
  } catch { /* the page still works; only the way back from another page is less exact */ }
}

export function mountDuaStudy(root, { search = location.search } = {}) {
  const where = readPlace(search);
  let data = null;
  const detourOf = () => (where.tie != null ? { n: where.tie, from: listOf(data, where)?.[where.open - 1]?.h } : null);

  function render() {
    closePop();
    root.textContent = "";
    closePull();
    const menu = el("div", "dua-pd-row");
    menu.id = "duaMenu";
    root.appendChild(menu);
    const body = el("div", "dua-study-body");
    body.id = "duaBody";
    root.appendChild(body);
    if (!data) {
      body.appendChild(el("p", "hadith-note", t("Loading…")));
      loadDuaGroups().then((d) => { data = d; settle(); render(); }).catch((err) => duaLoadFailed(body, render, err));
      return;
    }
    renderMenu(menu);
    writePlace(where);
    if (where.tie != null) return renderDetour(body);
    const list = listOf(data, where);
    if (where.open != null && list?.[where.open - 1]) return renderCard(body, list, where.open);
    renderList(body, list);
  }

  // A place read from an address may name something that is not there (an old link): fall back to the group's start.
  function settle() {
    const g = data.groups.get(where.g);
    if (g.parts && !g.parts.some((p) => p.id === where.part)) where.part = null;
    if (!g.parts) where.part = null;
    const list = listOf(data, where);
    // Back from a tied Dua card's Word card or narration: the tie still stands only if the dhikr really holds it.
    if (where.tie != null && list?.[where.open - 1]?.card !== where.tie) where.tie = null;
    if (where.tie != null) where.dua = null;
    if (where.dua != null) {
      // Coming back from a Word card: find the Dua in this list, or else in the whole Rasulullah list.
      let i = list?.findIndex((e) => e.kind === "dua" && e.n === where.dua) ?? -1;
      if (i < 0 && list) i = list.findIndex((e) => e.kind === "hisn" && e.card === where.dua);
      if (i < 0) { where.g = "rasul"; where.part = null; i = data.groups.get("rasul").items.findIndex((e) => e.n === where.dua); }
      where.open = i >= 0 ? i + 1 : null;
      where.dua = null;
    }
    const n = listOf(data, where)?.length ?? 0;
    if (where.open != null && (where.open < 1 || where.open > n)) where.open = null;
    where.lp = Math.min(where.lp, Math.max(1, Math.ceil(n / PER_PAGE)));
  }

  // ---- D21: the groups, and a group's parts, as pull-down menus ----
  let pull = null;
  function closePull() {
    if (!pull) return;
    pull.box.remove(); pull.btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", pull.outside, true);
    document.removeEventListener("keydown", pull.esc, true);
    pull = null;
  }
  function openPull(btn, fill) {
    if (pull?.btn === btn) { closePull(); return; }
    closePull();
    const box = el("div", "dua-pull");
    box.setAttribute("role", "menu");
    fill(box);
    btn.after(box);
    btn.setAttribute("aria-expanded", "true");
    // Audit part 138 D5: with large text the menu could run past the bottom of the screen; it ends inside it and scrolls
    // within itself (never shorter than about four rows).
    const room = innerHeight - box.getBoundingClientRect().top - 8;
    if (room < box.offsetHeight) box.style.maxHeight = `${Math.max(room, Math.min(box.offsetHeight, 12 * parseFloat(getComputedStyle(box).fontSize)))}px`;
    const outside = (e) => { if (!box.contains(e.target) && !btn.contains(e.target)) closePull(); };
    const esc = (e) => { if (e.key === "Escape") { closePull(); btn.focus(); } };
    document.addEventListener("click", outside, true);
    document.addEventListener("keydown", esc, true);
    pull = { btn, box, outside, esc };
    (box.querySelector("[aria-current]") ?? box.querySelector("button"))?.focus();
  }
  function pullItem(label, n, current, go, cls = "") {
    const b = el("button", `dua-pull-item ${cls}`.trim());
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.append(el("span", "dua-pull-label", label), el("span", "dua-pull-count", num(n)));
    if (current) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => { closePull(); go(); });
    return b;
  }
  function go(next) { Object.assign(where, { part: null, lp: 1, open: null, tie: null }, next); render(); root.scrollIntoView({ block: "start" }); }
  function pdButton(small, big, kind) {
    const b = el("button", "dua-pd");
    b.type = "button";
    b.dataset.duaPd = kind;
    b.setAttribute("aria-haspopup", "menu");
    b.setAttribute("aria-expanded", "false");
    b.append(el("small", null, small), el("b", null, `${big} ▾`));
    return b;
  }
  function renderMenu(menu) {
    const g = data.groups.get(where.g);
    const wrap = el("div", "dua-pd-wrap");
    const gb = pdButton(t("Dua groups"), groupName(where.g), "groups");
    gb.addEventListener("click", () => openPull(gb, (box) => {
      for (const id of GROUP_IDS) {
        const it = pullItem(groupName(id), countOf(data.groups.get(id)), where.g === id, () => go({ g: id }));
        it.dataset.duaGroup = id;
        box.appendChild(it);
      }
    }));
    wrap.appendChild(gb);
    menu.appendChild(wrap);
    if (g.parts) {
      const cur = g.parts.find((p) => p.id === where.part);
      const pw = el("div", "dua-pd-wrap");
      const pb = pdButton(groupName(where.g), cur ? partName(cur) : t("Choose a part"), "parts");
      pb.addEventListener("click", () => openPull(pb, (box) => {
        for (const p of g.parts) {
          const it = pullItem(partName(p), p.items.length, where.part === p.id, () => go({ g: where.g, part: p.id }));
          it.dataset.duaPart = p.id;
          box.appendChild(it);
        }
      }));
      pw.appendChild(pb);
      menu.appendChild(pw);
    }
  }

  // ---- D02: the numbered list ----
  function renderList(body, list) {
    const g = data.groups.get(where.g);
    const cur = g.parts?.find((p) => p.id === where.part);
    body.appendChild(el("h2", "dua-study-h", cur ? partName(cur) : groupName(where.g)));
    if (!list) {
      // A group with parts and none chosen yet: its parts, each a button.
      const tiles = el("div", "dua-tiles");
      for (const p of g.parts) {
        const b = el("button", "dua-tile");
        b.type = "button";
        b.dataset.duaPart = p.id;
        b.appendChild(el("b", null, partName(p)));
        if (p.ar) { const a = el("span", "dua-tile-ar", p.ar); a.lang = "ar"; a.dir = "rtl"; b.appendChild(a); }
        b.appendChild(el("span", "dua-tile-n", t("{n} duas", { n: num(p.items.length) })));
        b.addEventListener("click", () => go({ g: where.g, part: p.id }));
        tiles.appendChild(b);
      }
      body.appendChild(tiles);
      return;
    }
    if (!list.length) {
      const e = el("p", "hadith-note dua-empty", EMPTY[where.g]?.() ?? t("No duas here yet."));
      e.dataset.duaEmpty = where.g;
      body.appendChild(e);
      return;
    }
    if (where.g === "occasions") body.appendChild(el("p", "hadith-note", t("From Hisn al-Muslim (al-Qaḥṭānī), in its own order.")));
    if (where.g === "rasul" || where.g === "books") body.appendChild(el("p", "hadith-note", t("Most narrated first. Each dua's narrations were found by matching words and are still to be checked.")));
    const pages = Math.ceil(list.length / PER_PAGE);
    const from = (where.lp - 1) * PER_PAGE;
    const pager = () => {
      const nav = el("div", "dua-pager");
      if (pages < 2) return nav;
      const prev = el("button", "dua-ref", `‹ ${t("Previous")}`);
      prev.type = "button"; prev.disabled = where.lp <= 1; prev.dataset.duaListPrev = "";
      prev.addEventListener("click", () => { where.lp--; render(); root.scrollIntoView({ block: "start" }); });
      const next = el("button", "dua-ref", `${t("Next")} ›`);
      next.type = "button"; next.disabled = where.lp >= pages; next.dataset.duaListNext = "";
      next.addEventListener("click", () => { where.lp++; render(); root.scrollIntoView({ block: "start" }); });
      nav.append(prev, el("span", "hadith-note", t("{from}–{to} of {total}", { from: num(from + 1), to: num(Math.min(from + PER_PAGE, list.length)), total: num(list.length) })), next);
      return nav;
    };
    body.appendChild(pager());
    const ol = el("ol", "dua-list");
    ol.start = from + 1;
    list.slice(from, from + PER_PAGE).forEach((e, k) => {
      const i = from + k + 1;
      const li = el("li", "dua-list-item");
      const b = el("button", "dua-row");
      b.type = "button";
      b.dataset.duaNo = String(i);
      b.appendChild(el("span", "dua-row-no", num(i)));
      const main = el("span", "dua-row-main");
      const [line, meta] = rowText(e);
      const tt = titleOf(data, e);
      if (tt && !tt.ar) { const ts = el("span", "dua-row-title", tt.text); ts.dataset.duaRowTitle = ""; main.appendChild(ts); }
      if (line) {
        const ar = el("span", `dua-row-ar${line.heading ? " dua-row-heading" : ""}`, line.text);
        ar.lang = "ar"; ar.dir = "rtl";
        if (!line.heading) ar.style.fontFamily = quranFontStack();
        main.appendChild(ar);
      }
      main.appendChild(el("span", "dua-row-meta", meta));
      b.appendChild(main);
      b.addEventListener("click", () => { where.open = i; render(); root.scrollIntoView({ block: "start" }); });
      li.appendChild(b);
      ol.appendChild(li);
    });
    body.appendChild(ol);
    body.appendChild(pager());
    if (where.focusNo) {
      root.querySelector(`[data-dua-no="${where.focusNo}"]`)?.focus();
      where.focusNo = null;
    }
  }

  /** A list row's Arabic line ({ text, heading }) and its line of facts, in the reader's language. */
  function rowText(e) {
    if (e.kind === "dua") {
      const r = data.duaRow.get(e.n);
      const line = r?.[3] ? (Array.isArray(r[3]) ? { text: r[3][0], heading: true } : { text: r[3] }) : null;
      const bits = [t("Dua {n}", { n: num(e.n) })];
      if (e.std) bits.push(t("No. {n}", { n: num(e.std) }));
      if (r) bits.push(t("Narrated in {n} places", { n: num(r[2]) }));
      return [line, bits.join(" · ")];
    }
    if (e.kind === "hisn") {
      const bits = [t("Hisn al-Muslim {ref}", { ref: num(e.h) })];
      if (e.count > 1) bits.push(t("{n} times", { n: num(e.count) }));
      return [{ text: e.ar.length > 90 ? `${e.ar.slice(0, 90)} …` : e.ar }, bits.join(" · ")];
    }
    // A Qur'anic dua of a Prophet.
    const L = getAppLang() === "bn" ? "bn" : "en";
    return [{ text: e.ar.length > 90 ? `${e.ar.slice(0, 90)} …` : e.ar }, `${e.who[L]} · ${t("Qur'an {ref}", { ref: num(e.ref) })}`];
  }

  // ---- D04: the Dua Card, with ‹ › through its group and ← Back to the group ----
  function cardBar(list, i, backLabel, onBack) {
    const bar = el("div", "dua-card-bar");
    const back = el("button", "hadeethenc-crumb dua-card-back", backLabel);
    back.type = "button";
    back.dataset.duaCardBack = "";
    back.addEventListener("click", onBack);
    bar.appendChild(back);
    if (list) {
      const steps = el("div", "dua-card-steps");
      const prev = el("button", "dua-ref", "‹");
      prev.type = "button"; prev.disabled = i <= 1; prev.dataset.duaCardPrev = "";
      prev.setAttribute("aria-label", t("Previous dua"));
      prev.addEventListener("click", () => { where.open = i - 1; where.tie = null; render(); });
      const next = el("button", "dua-ref", "›");
      next.type = "button"; next.disabled = i >= list.length; next.dataset.duaCardNext = "";
      next.setAttribute("aria-label", t("Next dua"));
      next.addEventListener("click", () => { where.open = i + 1; where.tie = null; render(); });
      const pos = el("span", "hadith-note dua-card-pos", t("{i} of {n}", { i: num(i), n: num(list.length) }));
      pos.dataset.duaCardPos = `${i}/${list.length}`;
      steps.append(prev, pos, next);
      bar.appendChild(steps);
    }
    return bar;
  }
  function backToList() {
    const i = where.open;
    where.open = null;
    where.lp = Math.ceil(i / PER_PAGE);
    where.focusNo = i;
    render();
  }
  function renderCard(body, list, i) {
    const g = data.groups.get(where.g);
    const cur = g.parts?.find((p) => p.id === where.part);
    const name = cur ? partName(cur) : groupName(where.g);
    body.appendChild(cardBar(list, i, t("← Back to {name}", { name }), backToList));
    const e = list[i - 1];
    const slot = framedHost(body, titleOf(data, e));
    slot.parentElement.dataset.duaOpen = String(i);
    if (e.kind === "dua") return mountHadithDuaCard(slot, e.n);
    if (e.kind === "hisn") return slot.appendChild(hisnCard(e));
    slot.appendChild(quranCard(e));
  }
  function renderDetour(body) {
    const detour = detourOf();
    body.appendChild(cardBar(null, 0, t("← Back to Hisn al-Muslim {ref}", { ref: num(detour.from) }), () => { where.tie = null; render(); }));
    const slot = framedHost(body, titleOf(data, { kind: "dua", n: detour.n }));
    slot.parentElement.dataset.duaTieOpen = String(detour.n);
    mountHadithDuaCard(slot, detour.n);
  }

  // ---- D12 the top banner frame, D05 the title, D11 the bottom banner: the frame every Dua Card sits in ----
  function framedHost(body, title) {
    const host = el("div", "dua-card-host dua-frame");
    const arch = el("div", "dua-arch");
    arch.dataset.duaTopBanner = "";
    const ph = el("div", "dua-arch-ph");
    const b = el("b", null, "بِسْمِ ٱللَّهِ"); b.lang = "ar"; b.dir = "rtl";
    ph.append(b, el("span", null, t("Top banner · text to come")));
    arch.appendChild(ph);
    host.appendChild(arch);
    if (title) {
      const h = el("h2", `dua-card-title${title.ar ? " dua-card-title-ar" : ""}`, title.text);
      h.dataset.duaTitle = title.ar ? "ar" : "text";
      if (title.ar) { h.lang = "ar"; h.dir = "rtl"; }
      host.appendChild(h);
    }
    const slot = el("div", "dua-card-slot");
    host.appendChild(slot);
    const img = el("img", "dua-banner-bottom");
    img.src = BANNER_URL;
    img.alt = "Learn Deen On-the-Go · Madrasatul Muslimeen · Quran Revival · Aqhlaq · Ilm · Tawheed · Dawah · Hukm";
    img.loading = "lazy";
    img.dataset.duaBottomBanner = "";
    host.appendChild(img);
    body.appendChild(host);
    return slot;
  }

  // ---- D22: the card's menu; each block it names opens as a pop-up card with ✕ back to the Dua ----
  let pop = null;
  function closePop() {
    if (!pop) return;
    const { box, nodes, stash, from, esc } = pop;
    pop = null;
    if (stash) for (const n of nodes) stash.appendChild(n);
    box.remove();
    document.removeEventListener("keydown", esc, true);
    if (from?.isConnected) from.focus();
  }
  function openPop(from, label, nodes, stash, { openFirst = false, empty = null } = {}) {
    closePop();
    const box = el("div", "dua-pop");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", label);
    box.dataset.duaPop = from.dataset.duaMenu;
    const card = el("section", "dua-popcard");
    const head = el("div", "dua-pophead");
    const close = el("button", "dua-ref dua-pop-close", `✕ ${t("Close")}`);
    close.type = "button";
    close.dataset.duaPopClose = "";
    close.addEventListener("click", closePop);
    head.append(el("h3", null, label), close);
    card.appendChild(head);
    for (const n of nodes) card.appendChild(n);
    if (!nodes.length && empty) card.appendChild(el("p", "hadith-note", empty));
    box.appendChild(card);
    box.addEventListener("click", (ev) => {
      if (ev.target === box) closePop();
      // ✓ Check opens its panel under the card: the pop-up closes so the panel is in view.
      else if (ev.target.closest?.("[data-dua-check-open]")) closePop();
    });
    const esc = (ev) => { if (ev.key === "Escape" && pop?.box === box) { ev.stopPropagation(); closePop(); } };
    document.addEventListener("keydown", esc, true);
    root.appendChild(box);
    pop = { box, nodes, stash, from, esc };
    if (openFirst) { const d = card.querySelector("details"); if (d) d.open = true; }
    close.focus();
  }
  /**
   * Moves each section's blocks out of `article` into a hidden stash and puts the card's menu where `before` is (or at
   * the end). sections: [{ key, label, nodes, openFirst?, empty? }]; a section with no blocks and no `empty` is left out.
   */
  function cardMenu(article, sections, before = null) {
    const stash = el("div", "dua-pop-stash");
    stash.hidden = true;
    const menu = el("nav", "dua-card-menu");
    menu.setAttribute("aria-label", t("Dua Card menu"));
    for (const s of sections) {
      if (s.build) {
        // D07 / D14: drawn fresh each time it opens, from what the card shows now.
        const b = el("button", "dua-ref dua-menu-btn", s.label);
        b.type = "button";
        b.dataset.duaMenu = s.key;
        b.setAttribute("aria-haspopup", "dialog");
        b.addEventListener("click", () => openPop(b, s.label, s.build(), null, s));
        menu.appendChild(b);
        continue;
      }
      if (!s.nodes.length && !s.empty) continue;
      for (const n of s.nodes) stash.appendChild(n);
      const b = el("button", "dua-ref dua-menu-btn", s.label);
      b.type = "button";
      b.dataset.duaMenu = s.key;
      b.setAttribute("aria-haspopup", "dialog");
      b.addEventListener("click", () => openPop(b, s.label, s.nodes, stash, s));
      menu.appendChild(b);
    }
    if (before?.parentElement === article) article.insertBefore(menu, before); else article.appendChild(menu);
    article.appendChild(stash);
    return menu;
  }
  const kids = (article, sel) => [...article.children].filter((c) => c.matches(sel));
  /** D07 / D14: the poster and copy / share entries of a card's menu, for the sheet `sheetOf()` gives when opened. */
  const sheetSections = (sheetOf) => [
    { key: "poster", label: `🖼 ${t("Poster")}`, build: () => posterNodes(sheetOf()) },
    { key: "share", label: `${t("Copy / share")}`, build: () => shareNodes(sheetOf()) },
  ];
  const titled = (tt) => ({ title: tt && !tt.ar ? tt.text : null, titleAr: tt?.ar ? tt.text : null });
  /** D22 for the Hadith books' Dua card: words and progress stay; meaning, source, narration and ✓ Check pop up. */
  function layoutHadithCard(article, sheetOf) {
    cardMenu(article, [
      { key: "meaning", label: t("Meaning"), nodes: kids(article, ".hadeethenc-explanation"), openFirst: true, empty: t("No meaning for this dua in the app yet.") },
      { key: "source", label: t("Source"), nodes: kids(article, ".openiti-standard-number, .dua-also") },
      { key: "narration", label: t("The whole narration"), nodes: kids(article, "details.dua-narration") },
      { key: "check", label: t("✓ Check"), nodes: kids(article, ".dua-check-row") },
      ...sheetSections(sheetOf),
    ], article.querySelector(":scope > .dua-progress"));
  }

  /** A Dua from the Hadith books: the same card as Hadith Study's Dua tab (progress, notes, bookmark, checks). */
  function mountHadithDuaCard(host, n) {
    host.appendChild(el("p", "hadith-note", t("Loading…")));
    const page = data.duaRow.get(n)?.[1];
    if (!page) { host.textContent = ""; host.appendChild(el("p", "hadith-note", t("Dua {n} was not found.", { n: num(n) }))); return; }
    const state = { view: "dua", dua: { mode: "duas", page }, oi: null };
    // A narration's reference opens that book in Hadith Collections, with ← Back to this very card.
    const cardRender = () => {
      if (state.view === "books" && state.oi?.bookUri) {
        location.href = `./hadith-collections.html?openiti=${encodeURIComponent(state.oi.bookUri)}&passage=${state.oi.focusPassage}&back=1`;
        return;
      }
      render();
    };
    Promise.all([loadDuaCardsSummary(), loadDuaCardsPage(page), loadDuaWordLinks(page).catch(() => null), loadDuaVowels(page).catch(() => null),
      loadDuaWordGrammar(page).catch(() => null), loadDuaCheckEnv(state)]).then(([summary, cards, links, vowels, grammar, checkEnv]) => {
      const c = cards.find((x) => x.dua === n);
      host.textContent = "";
      if (!c) { host.appendChild(el("p", "hadith-note", t("Dua {n} was not found.", { n: num(n) }))); return; }
      const rows = [];
      const article = duaCard(c, summary, state, cardRender, rows, links, page, vowels, grammar, checkEnv);
      layoutHadithCard(article, () => hadithSheet(article, c, links, n));
      host.appendChild(article);
      fillDuaProgress(rows);
    }).catch((err) => duaLoadFailed(host, render, err));
  }

  /**
   * D07 / D14: what a Hadith-book Dua card holds, read when the poster or share opens (so the vowels switch is
   * respected). Word meanings come from the same Qur'an word links the card's word panel uses, only when those links
   * were made from these very words (their fingerprint).
   */
  function hadithSheet(article, c, wordLinks, n) {
    const spans = [...article.querySelectorAll(".dua-words [data-dua-word]")];
    const picked = duaWords(c.text);
    const links = wordLinks?.duas?.[c.dua];
    const ok = !!picked && !!links && links.f === duaWordsFingerprint(picked.words);
    const words = spans.length ? spans.map((s, i) => {
      const e = ok && (links.w[i] ?? -1) >= 0 ? wordLinks.entries[links.w[i]] : null;
      return [s.textContent, e?.[4] ?? "", e?.[5] ?? ""];
    }) : null;
    return {
      ...titled(titleOf(data, { kind: "dua", n })),
      ar: spans.length ? spans.map((s) => s.textContent).join(" ") : c.text,
      words, en: null, bn: null,
      ref: article.querySelector(".openiti-standard-number")?.textContent || t("Dua {n}", { n: num(n) }),
    };
  }

  function arabicBlock(text) {
    const p = el("p", "dua-words dua-study-ar", text);
    p.lang = "ar"; p.dir = "rtl";
    p.style.fontFamily = quranFontStack();
    return p;
  }
  /** A Hisn al-Muslim dhikr: its chapter, its words, how many times, al-Qaḥṭānī's reference, and its Dua card if tied. */
  function hisnCard(e) {
    const card = el("article", "hadith-card dua-card dua-hisn-card");
    card.dataset.duaHisn = e.h;
    card.appendChild(el("p", "hadith-card-head", t("Hisn al-Muslim {ref}", { ref: num(e.h) })));
    const h = el("h3", "dua-card-heading", e.chapter); h.lang = "ar"; h.dir = "rtl";
    card.appendChild(h);
    card.appendChild(arabicBlock(e.ar));
    if (e.count > 1) card.appendChild(el("p", "dua-hisn-count", t("Say it {n} times", { n: num(e.count) })));
    if (e.ref) {
      const r = el("p", "openiti-standard-number dua-hisn-ref");
      r.appendChild(document.createTextNode(`${t("Reference")}: `));
      const a = el("span", null, e.ref); a.lang = "ar"; a.dir = "rtl";
      r.appendChild(a);
      card.appendChild(r);
    }
    if (e.card) {
      const box = el("div", "dua-also");
      const head = el("p", "dua-also-head", t("The same dua in the Hadith books"));
      head.appendChild(el("span", "dua-proposed", t("matched by the computer, to be checked")));
      box.appendChild(head);
      const b = el("button", "dua-ref", t("Open Dua {n} ›", { n: num(e.card) }));
      b.type = "button";
      b.dataset.duaTie = String(e.card);
      b.addEventListener("click", () => { where.tie = e.card; render(); root.scrollIntoView({ block: "start" }); });
      box.appendChild(b);
      card.appendChild(box);
    }
    card.appendChild(el("p", "dua-words-note", t("Source: Hisn al-Muslim, typed by Abdellah Sellam (MIT licence).")));
    cardMenu(card, [
      { key: "source", label: t("Source"), nodes: kids(card, ".dua-hisn-ref, .dua-also, .dua-words-note") },
      ...sheetSections(() => ({ ...titled(titleOf(data, e)), ar: e.ar, words: null, en: null, bn: null,
        ref: `${t("Hisn al-Muslim {ref}", { ref: num(e.h) })}${e.ref ? ` · ${e.ref}` : ""}` })),
    ]);
    return card;
  }
  /** A Qur'anic dua of a Prophet: who, the āyah, its meaning, and the āyah in Quran Study with ← Back. */
  function quranCard(e) {
    const L = getAppLang() === "bn" ? "bn" : "en";
    const card = el("article", "hadith-card dua-card dua-quran-card");
    card.dataset.duaQuran = e.ref;
    card.appendChild(el("p", "hadith-card-head", `${e.who[L]} · ${t("Qur'an {ref}", { ref: num(e.ref) })}`));
    card.appendChild(arabicBlock(e.ar));
    card.appendChild(el("p", "dua-quran-meaning", e[L]));
    const a = el("a", "dua-ref dua-quran-open", t("Open in Quran Study ↗"));
    a.href = `./quranrevival.html?goto=${e.ref}&back=1`;
    card.appendChild(a);
    cardMenu(card, [
      { key: "meaning", label: t("Meaning"), nodes: kids(card, ".dua-quran-meaning") },
      { key: "source", label: t("Source"), nodes: kids(card, ".dua-quran-open") },
      ...sheetSections(() => ({ ...titled(titleOf(data, e)), ar: e.ar, words: e.words ?? null, en: e.en, bn: e.bn,
        ref: `${t("Qur'an {ref}", { ref: num(e.ref) })} · ${e.surah?.en ?? ""}` })),
    ]);
    return card;
  }

  render();
  return { render, where };
}
