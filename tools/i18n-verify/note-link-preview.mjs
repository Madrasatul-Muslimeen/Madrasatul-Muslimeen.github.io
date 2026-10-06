// Note pane Part C, item 43 (decisions 72, 81) -- the pure answer cleaner, link picker and cache behind link preview cards.
// Plain Node, no browser. Run from the repository root:  node tools/i18n-verify/note-link-preview.mjs
import {
  cleanPlain, cleanImageUrl, hostOf, cleanPreview, pickLinks, isOn, setOn, cacheGet, cachePut, loadPreview, LIMITS, SETTING_KEY, CACHE_KEY, MICROLINK,
} from "../../app/js/note-link-preview.js";
import fs from "node:fs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  if (ok && typeof ok.then === "function") throw new Error(`check "${name}" was handed a promise`);
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
}
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const ok = (data) => ({ status: "success", data });
const reply = (body, status = 200) => async () => ({ ok: status < 400, status, json: async () => body });

console.log("the setting");
{ const s = mem(); check("off by default", isOn(s) === false);
  setOn(s, true); check("on after being switched on", isOn(s) === true && s.getItem(SETTING_KEY) === "1");
  setOn(s, false); check("off again", isOn(s) === false);
  check("a storage that throws is off", isOn({ getItem() { throw new Error("x"); } }) === false); }

console.log("plain text");
check("markup is kept as characters, never interpreted", cleanPlain("<script>alert(1)</script>", 120) === "<script>alert(1)</script>");
check("control characters and runs of space collapse", cleanPlain("a\u0000b \n\t c", 50) === "a b c");
check("the title is capped at 120", cleanPlain("x".repeat(500), LIMITS.title).length === 120);
check("a 5,000-character description is capped at 240", cleanPlain("y".repeat(5000), LIMITS.description).length === 240);
check("a non-string is empty", cleanPlain(42, 10) === "" && cleanPlain(null, 10) === "" && cleanPlain({}, 10) === "");

console.log("the picture address");
check("https is kept", cleanImageUrl("https://img.example.com/a.png") === "https://img.example.com/a.png");
check("http is dropped", cleanImageUrl("http://img.example.com/a.png") === "");
check("javascript:, data: and protocol-relative are dropped", cleanImageUrl("javascript:alert(1)") === "" && cleanImageUrl("data:image/png;base64,AAA") === "" && cleanImageUrl("//x.com/a.png") === "");
check("an address that could break an attribute is dropped", cleanImageUrl('https://x.com/a"onerror="1') === "" && cleanImageUrl("https://x.com/a b") === "" && cleanImageUrl("https://x.com/<a>") === "");
check("an over-long address is dropped", cleanImageUrl(`https://x.com/${"a".repeat(2100)}`) === "");
check("a non-string is dropped", cleanImageUrl(null) === "" && cleanImageUrl({ toString: () => "https://x.com/a" }) === "");

console.log("the answer");
{ const p = cleanPreview(ok({ title: "T", description: "D", image: { url: "https://i.example/a.png" } }));
  check("a good answer is kept", p && p.title === "T" && p.description === "D" && p.image === "https://i.example/a.png"); }
{ const p = cleanPreview(ok({ title: "<img src=x onerror=alert(1)>", description: "z".repeat(5000), image: { url: "javascript:alert(1)" } }));
  check("a hostile answer is cleaned: no picture, capped text", p && p.image === "" && p.description.length === 240 && p.title === "<img src=x onerror=alert(1)>"); }
check("a failed status is nothing", cleanPreview({ status: "fail", data: { title: "T" } }) === null);
check("an answer with no text is nothing", cleanPreview(ok({ image: { url: "https://i.example/a.png" } })) === null);
check("junk is nothing and never throws", cleanPreview(null) === null && cleanPreview("x") === null && cleanPreview(ok(null)) === null && cleanPreview([]) === null);
check("a picture that is a plain string (not {url}) is ignored", cleanPreview(ok({ title: "T", image: "https://i.example/a.png" })).image === "");

console.log("which links");
check("host is the link's own host, www dropped", hostOf("https://www.example.com/a?b=1") === "example.com" && hostOf("http://example.com") === "" && hostOf("mailto:a@b.c") === "" && hostOf("nonsense") === "");
check("only https links are picked", JSON.stringify(pickLinks(["https://a.com/x", "http://b.com", "mailto:a@b.c", "javascript:alert(1)", "https://c.com/y"])) === JSON.stringify(["https://a.com/x", "https://c.com/y"]));
check("duplicates are picked once", pickLinks(["https://a.com", "https://a.com"]).length === 1);
check("at most five", pickLinks(Array.from({ length: 9 }, (_, i) => `https://s${i}.com/`)).length === 5);
check("an unsafe https address (space, quote) is not picked", pickLinks(['https://a.com/"x', "https://a.com/ x"]).length === 0);

console.log("the cache");
{ const s = mem(), T = 1_000_000_000_000, D = 24 * 3600 * 1000, pv = { title: "T", description: "D", image: "" };
  check("nothing cached at first", cacheGet(s, "https://a.com", T) === undefined);
  cachePut(s, "https://a.com", pv, T);
  check("a cached answer comes back", cacheGet(s, "https://a.com", T + D)?.title === "T");
  check("still good at 7 days", cacheGet(s, "https://a.com", T + 7 * D) !== undefined);
  check("gone after 7 days", cacheGet(s, "https://a.com", T + 7 * D + 1) === undefined);
  const s2 = mem();
  for (let i = 0; i < 230; i++) cachePut(s2, `https://s${i}.com`, pv, T + i);
  const all = JSON.parse(s2.getItem(CACHE_KEY));
  check("capped at 200 links", Object.keys(all).length === 200);
  check("the oldest are dropped, the newest kept", !all["https://s0.com"] && !all["https://s29.com"] && !!all["https://s30.com"] && !!all["https://s229.com"]);
  const s3 = mem(); cachePut(s3, "https://old.com", pv, T); cachePut(s3, "https://new.com", pv, T + 8 * D);
  check("a put sweeps out the expired", !JSON.parse(s3.getItem(CACHE_KEY))["https://old.com"]);
  const s4 = mem(); s4.setItem(CACHE_KEY, "{not json"); check("a damaged cache reads as empty", cacheGet(s4, "https://a.com") === undefined);
  const s5 = mem(); s5.setItem(CACHE_KEY, JSON.stringify({ "https://a.com": { at: Date.now(), data: { title: "<b>", description: "", image: "http://x/y.png" } } }));
  check("a cached picture is cleaned again on the way out", cacheGet(s5, "https://a.com").image === ""); }

console.log("loading");
(async () => {
  { const s = mem(); let calls = 0, asked = "";
    const f = async (u) => { calls++; asked = u; return { ok: true, status: 200, json: async () => ok({ title: "T", description: "D" }) }; };
    const a = await loadPreview("https://a.com/p?q=1", { storage: s, fetchFn: f });
    check("a fresh link asks Microlink with the encoded address", a.preview?.title === "T" && calls === 1 && asked === `${MICROLINK}?url=${encodeURIComponent("https://a.com/p?q=1")}`);
    const b = await loadPreview("https://a.com/p?q=1", { storage: s, fetchFn: f });
    check("the second time uses the cache and asks nobody", b.preview?.title === "T" && calls === 1); }
  { const s = mem(); const r = await loadPreview("https://a.com", { storage: s, fetchFn: reply({}, 429) });
    check("a refusal (429) is reported as refused and not cached", r.error === "refused" && s.getItem(CACHE_KEY) === null); }
  { const s = mem(); const r = await loadPreview("https://a.com", { storage: s, fetchFn: async () => { throw new TypeError("offline"); } });
    check("no network is reported as network and not cached", r.error === "network" && s.getItem(CACHE_KEY) === null); }
  { const s = mem(); const r = await loadPreview("https://a.com", { storage: s, fetchFn: async () => ({ ok: true, json: async () => { throw new Error("bad json"); } }) });
    check("unreadable JSON is reported as refused", r.error === "refused"); }
  { const s = mem(); const r = await loadPreview("https://a.com", { storage: s, fetchFn: reply({ status: "fail" }) });
    check("an answer with nothing in it is empty, not an error", r.empty === true && !r.error); }

  console.log("wiring");
  const src = fs.readFileSync("app/js/note-link-preview.js", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  check("the module touches no DOM, Firebase or innerHTML", !/firebase|document\.|window\.|innerHTML|Firestore/i.test(src));
  const win = fs.readFileSync("app/js/note-window.js", "utf8");
  check("the Note window imports the module", /from "\.\/note-link-preview\.js"/.test(win));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
