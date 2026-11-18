// The Owner, 18 Nov 2026 (Vocab List): the owner's titles and hidden groups (known-group-settings.js) and the Word card <-> Vocab List sync
// (known-groups-sync.js). Pure. Run from the repository root:  node tools/i18n-verify/known-groups-settings-sync.mjs [--mutate=NAME]
//   --mutate=openkeys   any key is accepted from the document      -> "a stray key cannot invent a group" FAILS
//   --mutate=nolang     a title in one language shows in the other  -> "a Bangla title does not show in English" FAILS
//   --mutate=hidemine   hiding drops the owner's titles             -> "hiding keeps the owner's titles (nothing is deleted)" FAILS
//   --mutate=nomarks    marks of a kind do not reach their group    -> "a word marked Rituals is in the Ebadah group" FAILS
//   --mutate=staticpress  a curated list presses a tappable chip   -> "a tappable chip is NOT pressed by a curated list alone" FAILS
//   --mutate=langonly   My Language holds only the curated list     -> "My Language holds every marked word" FAILS
import fs from "node:fs";
const MUTATE = (process.argv.find((a) => a.startsWith("--mutate=")) || "").slice(9);
const MUT = {
  openkeys: ["app/js/known-group-settings.js", "for (const k of KNOWN_TITLE_KEYS) {", "for (const k of Object.keys(raw.titles)) {"],
  nolang: ["app/js/known-group-settings.js", 'settings?.titles?.[key]?.[lang === "bn" ? "bn" : "en"] || original', "(settings?.titles?.[key]?.en || settings?.titles?.[key]?.bn) || original"],
  hidemine: ["app/js/known-group-settings.js", "return { ...s, hidden: KNOWN_GROUP_KEYS.filter((k) => set.has(k)) };", "return { titles: {}, hidden: KNOWN_GROUP_KEYS.filter((k) => set.has(k)) };"],
  nomarks: ["app/js/known-groups-sync.js", "if (kind) for (const l of banglaWordsOfKind(banglaState, kind)) out.add(l);", ""],
  staticpress: ["app/js/known-groups-sync.js", "if (kind) return { k, on: mine.has(kind), member:", "if (kind) return { k, on: mine.has(kind) || inStatic, member:"],
  langonly: ["app/js/known-groups-sync.js", 'if (key === "language") return new Set([...out, ...activeBanglaSet(banglaState)]);', 'if (key === "language") return out;'],
};
if (MUTATE && !MUT[MUTATE]) throw new Error(`unknown mutation ${MUTATE}`);
const dir = fs.mkdtempSync("/tmp/kgs-");
for (const f of ["known-group-settings.js", "known-groups-sync.js", "bangla-words.js"]) {
  let src = fs.readFileSync(`app/js/${f}`, "utf8");
  if (MUTATE && MUT[MUTATE][0].endsWith(f)) { const [, a, b] = MUT[MUTATE]; if (src.split(a).length !== 2) throw new Error(`anchor missing: ${MUTATE}`); src = src.split(a).join(b); }
  fs.writeFileSync(`${dir}/${f}`, src);
}
const S = await import(`${dir}/known-group-settings.js`), Y = await import(`${dir}/known-groups-sync.js`), B = await import(`${dir}/bangla-words.js`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { if (ok && typeof ok.then === "function") throw new Error(`promise: ${n}`); if (ok) { pass++; console.log(`  PASS  ${n}`); } else { fail++; console.log(`  FAIL  ${n} ${d}`); } };
const doc = (o) => ({ [S.KNOWN_SETTINGS_FIELD]: o });

check("an empty or odd tenant document gives the empty settings and never throws", [undefined, null, {}, doc(7), doc("x"), doc({ titles: 5, hidden: "no" })].every((d) => JSON.stringify(S.knownGroupSettingsFromTenantDoc(d)) === '{"titles":{},"hidden":[]}'));
let st = S.knownGroupSettingsFromTenantDoc({});
st = S.withKnownTitle(st, "prophets", "en", "  The   Prophets ");
check("a title is trimmed and its spaces collapsed", st.titles.prophets.en === "The Prophets", JSON.stringify(st));
check("an owner's title shows in its own language and the app's words show in the other", S.knownTitleFor(st, "prophets", "en", "Prophet's Names") === "The Prophets" && S.knownTitleFor(st, "prophets", "bn", "নবীদের নাম") === "নবীদের নাম");
st = S.withKnownTitle(st, "prophets", "bn", "নবীগণ");
check("a Bangla title does not show in English", S.knownTitleFor(st, "prophets", "en", "x") === "The Prophets" && S.knownTitleFor(st, "prophets", "bn", "x") === "নবীগণ");
check("an empty text puts the app's words back (reset) for that language only", (() => { const r = S.withKnownTitle(st, "prophets", "en", ""); return S.knownTitleFor(r, "prophets", "en", "orig") === "orig" && S.knownTitleFor(r, "prophets", "bn", "orig") === "নবীগণ"; })());
check("a title is cut at 80 letters", S.withKnownTitle(S.knownGroupSettingsFromTenantDoc({}), "daily", "en", "x".repeat(200)).titles.daily.en.length === 80);
check("a stray key cannot invent a group or a title", (() => { const r = S.knownGroupSettingsFromTenantDoc(doc({ titles: { evil: { en: "x" }, daily: { en: "ok" } }, hidden: ["evil", "daily"] })); return !("evil" in r.titles) && r.titles.daily.en === "ok" && r.hidden.join() === "daily"; })());
check("the heading 'Already known' can be retitled too", S.withKnownTitle(S.knownGroupSettingsFromTenantDoc({}), S.KNOWN_HEADING_KEY, "en", "Known").titles._known.en === "Known");
let h = S.withKnownGroupHidden(st, "people", true);
check("hiding keeps the owner's titles (nothing is deleted)", h.hidden.join() === "people" && h.titles.prophets?.en === "The Prophets", JSON.stringify(h));
check("the hidden group leaves the visible list; showing again brings it back in place", S.visibleKnownGroupKeys(h).join() === "allah,prophets,ibadah,daily,language,bnnames" && S.visibleKnownGroupKeys(S.withKnownGroupHidden(h, "people", false)).join() === S.KNOWN_GROUP_KEYS.join());
check("only the seven groups can be hidden", S.withKnownGroupHidden(st, "_known", true).hidden.length === 0);
let saved = null;
await S.saveKnownGroupSettings({}, "t1", h, async (db, col, id, data) => { saved = { col, id, data }; });
check("saving writes ONE additive field on the tenants document", saved?.col === "tenants" && saved.id === "t1" && Object.keys(saved.data).join() === "learnNextKnownGroups" && saved.data.learnNextKnownGroups.hidden.join() === "people");

// the sync
let b = B.emptyBanglaState(); b = { ...b, list: "mine" };
b = B.toggleBanglaKind(b, "w1", "rituals", { list: "mine" });
b = B.toggleBanglaKind(b, "w2", "names", { list: "mine" });
b = B.toggleBanglaKind(b, "w3", "bangla", { list: "mine" });
check("a word marked Rituals is in the Ebadah group (and the curated words stay)", Y.knownGroupLemmas("ibadah", ["c1"], b).has("w1") && Y.knownGroupLemmas("ibadah", ["c1"], b).has("c1") && !Y.knownGroupLemmas("ibadah", [], b).has("w2"));
check("Names in My Language gets the 'names' marks, Daily Life the 'bangla' marks", Y.knownGroupLemmas("bnnames", [], b).has("w2") && Y.knownGroupLemmas("daily", [], b).has("w3") && !Y.knownGroupLemmas("daily", [], b).has("w1"));
check("My Language holds every marked word", ["w1", "w2", "w3"].every((l) => Y.knownGroupLemmas("language", [], b).has(l)));
check("the curated Names groups never take a mark", !Y.knownGroupLemmas("allah", [], b).has("w1"));
const groups = [{ k: "allah", lemmas: ["a1"] }, { k: "ibadah", lemmas: [] }, { k: "daily", lemmas: [] }, { k: "language", lemmas: [] }, { k: "bnnames", lemmas: [] }];
const m1 = Y.knownGroupMarks({ groups, state: b, lemma: "w1" });
check("the Word card chips for a Rituals word: Ebadah and My Language lit, only the three kinds can be tapped", m1.filter((x) => x.on).map((x) => x.k).join() === "ibadah,language" && m1.filter((x) => x.kind).map((x) => x.k).join() === "ibadah,daily,bnnames", JSON.stringify(m1));
// Codex P2s on #1812: a tappable chip shows the STORED kind it toggles, also while the list is off; curated membership is "member", not "on"
check("a tappable chip is NOT pressed by a curated list alone (the tap would not change what it shows); it is marked as a member", (() => { const g2 = [{ k: "ibadah", lemmas: ["c9"] }]; const m = Y.knownGroupMarks({ groups: g2, state: b, lemma: "c9" })[0]; return m.on === false && m.member === true && m.kind === "rituals"; })());
check("with the list switched off a stored mark still shows pressed, so a tap on a pressed chip removes it and a tap on an unpressed chip adds one", (() => { const off = { ...b, on: false }; const m = Y.knownGroupMarks({ groups, state: off, lemma: "w1" }).find((x) => x.k === "ibadah"); return m.on === true && m.member === false; })());
check("a curated Name is lit by its list, not by a mark", Y.knownGroupMarks({ groups, state: b, lemma: "a1" }).find((x) => x.k === "allah").on === true);
check("an unmarked word lights nothing", Y.knownGroupMarks({ groups, state: b, lemma: "zz" }).every((x) => !x.on));
check("switching the whole list off empties the marked groups (the group lists and My Language), while the chip keeps the stored kind", (() => { const off = { ...b, on: false }; const ms = Y.knownGroupMarks({ groups, state: off, lemma: "w1" }); return !Y.knownGroupLemmas("ibadah", [], off).has("w1") && !Y.knownGroupLemmas("language", [], off).has("w1") && ms.find((x) => x.k === "language").on === false; })());
console.log(`\n==== Known groups: owner titles, hide, Word card sync${MUTATE ? ` [MUTATE=${MUTATE}]` : ""}: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
