// J03 K3b "Study Next": the hand check of app/data/tafsir-links.json, made repeatable. NETWORK, run by hand (not in
// `verify`): it opens every book's link at two āyāt and passes a link only when that book's OWN TEXT for that āyah is on
// the page -- a status code proves nothing here (tafsir.app answers 200 for a book that does not exist).
//   quran.com    its API's text for that tafsīr id at that āyah (the page itself is drawn in the browser)
//   tafsir.app   the server-drawn #preloaded-text of that book, and the canonical link is the address we use
//   altafsir.com the page names that book as chosen and carries a word of that āyah in its commentary
// Usage (from the repository root): node tools/i18n-verify/tafsir-links-online.mjs
import fs from "node:fs";
import { tafsirLinkHref } from "../../app/js/read-next.js";

const data = JSON.parse(fs.readFileSync("app/data/tafsir-links.json", "utf8"));
const AYAT = [[2, 255, "القيوم"], [36, 38, "لمستقر"]];
const WORD = { "2:255": "القيوم" };
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/[ؐ-ًؚ-ٰٟـۖ-ۭ]/g, "").replace(/ٱ/g, "ا"); // marks off; ٱ (alif waṣla) -> ا
let passed = 0, failed = 0;
const qcIds = new Map();
async function get(url, enc = "utf-8") {
  const res = await fetch(url, { redirect: "follow" });
  return new TextDecoder(enc).decode(await res.arrayBuffer());
}
const list = JSON.parse(await get("https://api.quran.com/api/v4/resources/tafsirs")).tafsirs;
for (const t of list) qcIds.set(t.slug, t.id);
// THE RIGHT BOOK, not just a book: each site's own name for the book's author must be the one the list records.
const qcAuthor = new Map(list.map((t) => [t.slug, `${t.name} ${t.author_name}`]));
const home = await get("https://tafsir.app/");
const taAuthor = new Map([...home.matchAll(/data-src=([a-z0-9-]+)[^>]*>[\s\S]*?class=author>([^<]*)</g)].map((m) => [m[1], m[2]]));
for (const link of data.links) {
  if (!link.site) continue;
  // A book that covers only some āyāt is tested at an āyah it covers (its `probe`), not at the two fixed ones.
  const at = link.partial ? [[...link.probe.split(":").map(Number), WORD[link.probe] ?? null]] : AYAT;
  for (const [s, a, word] of at) {
    const href = tafsirLinkHref(data, link, s, a);
    let ok = false, why = "";
    try {
      if (link.site === "quran.com") {
        const id = qcIds.get(link.book);
        const j = JSON.parse(await get(`https://api.quran.com/api/v4/tafsirs/${id}/by_ayah/${s}:${a}`));
        const text = strip(j.tafsir?.text ?? "");
        const right = (qcAuthor.get(link.book) ?? "").includes(link.author);
        ok = id != null && text.length > 100 && right; why = `id ${id}, ${text.length} chars, author ${right}`;
      } else if (link.site === "tafsir.app") {
        const html = await get(href);
        const m = html.match(/id=preloaded-text[^>]*>([\s\S]*?)<\/div>/);
        const text = m ? strip(m[1]).trim() : "";
        const canon = (html.match(/rel="canonical" href="([^"]+)"/) ?? [])[1];
        // tafsir.app opens a passage a book explains together at its FIRST āyah (36:38 -> 36:37): accepted when it is
        // the same book, the same sūrah and at most 30 āyāt back (al-Thaʿlabī reads 36:13-38 as one story) -- that is where this āyah's commentary is.
        const cm = canon?.match(/^https:\/\/tafsir\.app\/([^/]+)\/(\d+)\/(\d+)$/);
        const sameGroup = cm && cm[1] === link.book && Number(cm[2]) === s && a - Number(cm[3]) >= 0 && a - Number(cm[3]) <= 30;
        const right = (taAuthor.get(link.book) ?? "").includes(link.author);
        ok = text.length > 40 && sameGroup && right; why = `${text.length} chars, opens at ${cm ? `${cm[2]}:${cm[3]}` : canon}, author ${right}`;
      } else if (link.site === "altafsir.com") {
        const html = await get(href, "windows-1256");
        // Every SELECTED option, not the first: the sūrah menu has its own (36 is also Yā-Sīn).
        const opts = [...html.matchAll(new RegExp(`<option\\s+selected\\s+value=${link.book}>([^<]*)<`, "g"))].map((m) => m[1]);
        const chosen = opts.some((o) => o.includes(link.author));
        const has = word ? strip(html).includes(word) : strip(html).length > 2000;
        ok = chosen && has; why = `book chosen ${chosen}, āyah word ${has}`;
      }
    } catch (err) { why = String(err); }
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${link.scholar} ${link.title} @ ${s}:${a} -- ${link.site} (${why})`);
  }
}
console.log(`\n==== Tafsīr links online: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
