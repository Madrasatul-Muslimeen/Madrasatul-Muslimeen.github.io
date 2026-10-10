// Pictures in Notes (Part C, item 35) -- the pure checks: the path pattern, the size step-down (plain Node), and the
// sanitiser with the REAL DOMPurify in a browser page (a Note picture is kept; a bad path, a src, an onerror, an http:
// path and a ../ path are not). Run from the repository root with `node serve.js` running.
import assert from "node:assert/strict";
import { chromium, BASE } from "./harness.mjs";
import { isNoteImagePath, shrinkToTarget, noteImageOwner, NOTE_IMAGE_TARGET_BYTES, NOTE_IMAGE_MAX_BYTES } from "../../app/js/note-image-path.js";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}

// ---- path ----
const good = "noteImages/uid_123/AbCdEf12_-xyz.webp";
check("a good path is accepted", isNoteImagePath(good) && noteImageOwner(good) === "uid_123");
for (const bad of ["noteImages/u1/short.webp", "noteImages/u1/AbCdEf12.png", "noteImages/../x/AbCdEf12.webp", "noteImages/u1/../AbCdEf12.webp", "http://x/noteImages/u1/AbCdEf12.webp", "https://firebasestorage.googleapis.com/v0/b/x/o/noteImages%2Fu1%2FAbCdEf12.webp?token=1", "/noteImages/u1/AbCdEf12.webp", "noteImages/u1/AbCdEf12.webp?x=1", "noteImages/u1/a/AbCdEf12.webp", "noteImages/u1/AbCdEf12.webp\n", "", null])
  check(`refused: ${JSON.stringify(bad)}`, !isNoteImagePath(bad));

// ---- step-down ----
const sizeAt = (q, side) => Math.round(side * side * q * 0.2); // a toy encoder: bytes grow with quality and area
const calls = [];
const enc = (sz) => async (q, side) => { calls.push([q, side]); return { size: sz(q, side) }; };
{
  const r = await shrinkToTarget(enc(() => 150 * 1024));
  check("already small: first try wins, at the top quality and 1600px", r.quality === 0.85 && r.side === 1600 && calls.length === 1, JSON.stringify(r));
}
{
  calls.length = 0;
  const r = await shrinkToTarget(enc(sizeAt));
  check("steps the quality down until it lands at or under ~200 KB", r.blob.size <= NOTE_IMAGE_TARGET_BYTES && r.quality < 0.85 && calls.length > 1, JSON.stringify(r));
  check("it stops at the FIRST quality that fits (does not keep shrinking)", calls.length === 1 || sizeAt(calls.at(-2)[0], calls.at(-2)[1]) > NOTE_IMAGE_TARGET_BYTES);
}
{
  calls.length = 0;
  const r = await shrinkToTarget(enc((q, s) => (s < 1000 ? 350 * 1024 : 900 * 1024)));
  check("over the target but under the ceiling at a smaller size: keeps it (≤ 400 KB)", !r.tooBig && r.blob.size <= NOTE_IMAGE_MAX_BYTES && r.blob.size > NOTE_IMAGE_TARGET_BYTES, JSON.stringify(r));
}
{
  const r = await shrinkToTarget(enc(() => 900 * 1024));
  check("never fits: refuses (tooBig) rather than hand back more than 400 KB", r.tooBig === true, JSON.stringify(r));
}

// ---- the sanitiser, with the real DOMPurify ----
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(BASE + "/app/journey-map.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!window.DOMPurify);
const clean = (html) => page.evaluate(async (h) => (await import("/app/js/note-sanitize.js")).sanitizeNoteHtml(h), html);
const imgs = async (html) => page.evaluate((h) => { const t = document.createElement("template"); t.innerHTML = h; return [...t.content.querySelectorAll("img")].map((i) => ({ attrs: Object.fromEntries([...i.attributes].map((a) => [a.name, a.value])) })); }, await clean(html));

{
  const r = await imgs(`<p>x</p><img data-mmsa-image="${good}" alt="A map" width="50">`);
  check("a good picture is kept, with its path, alt and width", r.length === 1 && r[0].attrs["data-mmsa-image"] === good && r[0].attrs.alt === "A map" && r[0].attrs.width === "50", JSON.stringify(r));
}
{
  const r = await imgs(`<img data-mmsa-image="${good}" alt="ok" src="https://evil.example/x.png" onerror="alert(1)" style="x" class="c" loading="lazy" width="9999" id="i">`);
  check("on a good picture, src / onerror / style / class / id / loading are removed and a width off the list is dropped",
    r.length === 1 && Object.keys(r[0].attrs).sort().join() === "alt,data-mmsa-image", JSON.stringify(r));
}
for (const [name, html] of [
  ["another path shape (../)", `<img data-mmsa-image="noteImages/../x/AbCdEf12.webp">`],
  ["a path inside a path (../ later)", `<img data-mmsa-image="noteImages/u1/../AbCdEf12.webp">`],
  ["an http: path", `<img data-mmsa-image="http://noteImages/u1/AbCdEf12.webp">`],
  ["a download URL with a token", `<img data-mmsa-image="https://firebasestorage.googleapis.com/v0/b/b/o/noteImages%2Fu1%2FAbCdEf12.webp?alt=media&token=t">`],
  ["a javascript: path", `<img data-mmsa-image="javascript:alert(1)">`],
  ["a wrong extension", `<img data-mmsa-image="noteImages/u1/AbCdEf12.svg">`],
  ["no path, an onerror", `<img src=x onerror="window.__p=1">`],
  ["no path, a javascript: src", `<img src="javascript:window.__p=1">`],
  ["no path, a data: src", `<img src="data:image/png;base64,AAAA">`],
  ["no path, a blob: src", `<img src="blob:https://x/1">`],
]) {
  const out = await clean(html);
  check(`removed: ${name}`, !/<img/i.test(out) && !/onerror|javascript:/i.test(out), out);
}
{
  const r = await imgs(`<img src="https://mappingmyjourney.com/a.jpg" alt="old"><img data-mmsa-image="noteImages/u1/short.webp" src="https://mappingmyjourney.com/b.jpg">`);
  check("an imported https picture still works, and a bad path with an https src falls back to just the src", r.length === 2 && r.every((i) => !("data-mmsa-image" in i.attrs) && /^https:/.test(i.attrs.src)), JSON.stringify(r));
}
{
  const out = await clean(`<table><tr><td width="40">x</td></tr></table><p width="5">y</p>`);
  check("width is stripped from everything that is not a Note picture", !/width/.test(out), out);
}
{
  const r = await imgs(`<img data-mmsa-image="${good}" alt="${"a".repeat(300)}<b>">`);
  check("alt is plain text, at most 200 characters", r.length === 1 && r[0].attrs.alt.length <= 200 && !/[<>]/.test(r[0].attrs.alt), JSON.stringify(r));
}
await browser.close();

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
