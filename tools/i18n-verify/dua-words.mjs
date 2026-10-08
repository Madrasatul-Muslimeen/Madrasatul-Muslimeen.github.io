// app/js/dua-words.js -- the supplication's own words picked out of a Dua card's narration (the Owner, 8 Oct 2026:
// "Go ahead with clean dua words on each card"). Pure, against the real 3,126 cards. Expected values written BY HAND
// from the demo the Owner saw (https://claude.ai/artifact/ETD3jbbbBfnFRBGzhWZ6JG). Run from the repository root.
import fs from "node:fs";
const { duaWords, duaNarration } = await import("../../app/js/dua-words.js");

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (typeof ok?.then === "function") throw new Error(`check "${name}" was given a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
};
const dir = "tools/hadith-data-pull/output/dua";
const cards = fs.readdirSync(dir).filter((f) => /^cards-\d+\.json$/.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")).cards);
const byN = new Map(cards.map((c) => [c.dua, c]));
const res = new Map(cards.map((c) => [c.dua, duaWords(c.text)]));

check("POSITIVE CONTROL: all 3,126 dua cards are read", cards.length === 3126, String(cards.length));
const found = [...res.values()].filter(Boolean).length;
check("words are picked out on 1,112 of them (the demo's number)", found === 1112, String(found));
check("every pick is exactly the narration's own text between start and end (so it can be marked in place)",
  cards.every((c) => { const r = res.get(c.dua); return !r || duaNarration(c.text).slice(r.start, r.end) === r.words; }));
check("no pick is shorter than three words", [...res.values()].every((r) => !r || r.words.split(/\s+/).length >= 3));
check("Dua 1 (bedtime): the chain is left out, the supplication kept whole",
  res.get(1)?.words === "اللهم أسلمت نفسي إليك وفوضت أمري إليك وألجأت ظهري إليك رهبة ورغبة إليك لا ملجأ ولا منجا منك إلا إليك آمنت بكتابك الذي أنزلت وبنبيك الذي أرسلت", res.get(1)?.words);
check("Dua 1: the narration before it (the chain) is not in the words", !res.get(1).words.includes("حدثنا") && duaNarration(byN.get(1).text).startsWith("حدثنا مسدد"));
check("Dua 4: «اللهم ربنا آتنا في الدنيا حسنة …»", res.get(4)?.words === "اللهم ربنا أتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار", res.get(4)?.words);
check("Dua 11: stops where the narrators' remarks begin (no «تابعه …»)", res.get(11)?.words === "باسمك ربي وضعت جنبي وبك أرفعه إن أمسكت نفسي فارحمها وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين" && !res.get(11).words.includes("تابعه"), res.get(11)?.words);
check("Dua 3: nothing picked out (the card keeps its narration as today)", res.get(3) === null, JSON.stringify(res.get(3)));
check("duaNarration drops OpenITI's trailing number marks", duaNarration("نص \\ 12 \\") === "نص");
check("a bare «رب» opening a chain is not taken as a dua", duaWords("رب - واللفظ لقتيبة - قالا: حدثنا جرير") === null);

console.log(`\n==== Dua words picked out: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
