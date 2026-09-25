// Speed part 3 (issue #278, 25 Sep 2026): getMyMemberships() was split into
// a roles-only read (getMyMembershipRoles(), one round trip) and a separate
// hydration step (hydrateMemberships(), tenant document names/data) so
// quranrevival.html could fire the tenant document read ALONGSIDE
// tenantPeople/trackables instead of before them -- see
// quranrevival-startup-reads.mjs (4 round trips -> 3). pickContext() itself
// was not touched, but it is now fed the ROLES-ONLY list rather than the
// fully hydrated one, so this suite exists to prove that split changed
// nothing about WHICH tenant a reader with more than one lands on, or what
// they see once there.
//
// Two halves.
//
// PART 1 tests the pure functions directly -- no browser, no Firestore --
// using the `data:` module rewrite technique study-event-wiring.mjs
// established: the REAL app/js/session-context.js, with its app imports
// rewritten to injected fakes, so the file under test is the file that
// ships. This is where the mutation lives: a pickContext() that stops
// honouring defaultTenantId is proven to fail the check that exists to
// catch exactly that.
//
// PART 2 drives the real page (quranrevival.html) in a browser
// (tools/i18n-verify/harness.mjs), seeded with a uid that belongs to TWO
// tenants with different roles, to prove the split doesn't change what a
// reader with two tenants actually sees: the chosen tenant, the roster and
// roles after switching, and the tenant picker's own names.
//
// Run from the repository root with `node serve.js` running:
//   node tools/i18n-verify/session-context-two-tenant.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, newContext, BASE } from "./harness.mjs";

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    pass++; console.log(`  PASS  ${name}`);
  } catch (err) { fail++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}
async function checkAsync(name, fn) {
  try { await fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (err) { fail++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

// ---------------------------------------------------------------------------
// PART 1 -- pure functions, no browser, no Firestore.
// ---------------------------------------------------------------------------

const root = path.resolve(process.argv[2] || process.cwd());
const REAL_SOURCE = fs.readFileSync(path.join(root, "app/js/session-context.js"), "utf8");

function rewriteImports(source) {
  return source
    .replace(
      /import \{ collection, query, where, getDocs, doc, getDoc \} from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
      "const { collection, query, where, getDocs, doc, getDoc } = globalThis.__scFirestore;"
    )
    .replace(/import \{ TENANT \} from "\.\/collections\.js";/, "const { TENANT } = globalThis.__scCollections;")
    .replace(/import \{ langText \} from "\.\/lang\.js";/, "const { langText } = globalThis.__scLang;")
    .replace(/import \{ getAppLang \} from "\.\/prefs\.js";/, "const { getAppLang } = globalThis.__scPrefs;");
}

// AN UNREWRITTEN IMPORT IS A DEAD SUITE, NOT A FAILING ONE (this project's
// own standing lesson) -- a relative or gstatic specifier inside a `data:`
// module throws ERR_INVALID_URL at load, before a single check runs. Fail
// here instead, by name, the moment session-context.js gains a new import.
for (const leftover of [/from "\.\//, /gstatic\.com/]) {
  assert.ok(!leftover.test(rewriteImports(REAL_SOURCE)),
    `an import was not rewritten: ${leftover} -- add it above, or this suite runs nothing`);
}

// Real implementations -- these three files have no Firebase/DOM dependency
// at module scope (confirmed by reading them), so the file under test gets
// the genuine langText()/TENANT/getAppLang() it ships with, not a fake.
globalThis.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    __reset: () => { store = {}; },
  };
})();
globalThis.__scCollections = await import(pathToFileURL(path.join(root, "app/js/collections.js")));
globalThis.__scLang = await import(pathToFileURL(path.join(root, "app/js/lang.js")));
globalThis.__scPrefs = await import(pathToFileURL(path.join(root, "app/js/prefs.js")));

// A tiny fake Firestore -- just enough to answer the two collections
// session-context.js actually touches (tenantMemberUids, tenants), scoped
// per fake "db" object so different scenarios never share data.
function fakeDb(data) {
  return { __data: data };
}
globalThis.__scFirestore = {
  collection: (db, name) => ({ __col: name, __db: db }),
  doc: (db, name, id) => ({ __col: name, __id: id, __db: db }),
  where: (field, op, value) => ({ field, op, value }),
  query: (col, ...clauses) => ({ __col: col.__col, __db: col.__db, __clauses: clauses }),
  getDocs: async (q) => {
    const rows = (q.__db.__data[q.__col] || []).filter((d) =>
      (q.__clauses || []).every((c) => (c.op === "==" ? d[c.field] === c.value : true))
    );
    return { docs: rows.map((d) => ({ id: d._id, data: () => { const { _id, ...rest } = d; return rest; } })) };
  },
  getDoc: async (ref) => {
    const row = (ref.__db.__data[ref.__col] || []).find((d) => d._id === ref.__id);
    return row
      ? { id: row._id, exists: () => true, data: () => { const { _id, ...rest } = row; return rest; } }
      : { id: ref.__id, exists: () => false, data: () => undefined };
  },
};

async function loadSessionContext(sourceOverride) {
  const rewritten = rewriteImports(sourceOverride ?? REAL_SOURCE);
  return import(`data:text/javascript,${encodeURIComponent(rewritten)}`);
}

const TWO_TENANT_DATA = {
  tenantMemberUids: [
    { _id: "t1__uidX", tenantId: "t1", uid: "uidX", personId: "p1", roles: ["owner", "prime"] },
    { _id: "t2__uidX", tenantId: "t2", uid: "uidX", personId: "p2", roles: ["teacher"] },
  ],
  tenants: [
    { _id: "t1", name: { en: "First Madrasah", bn: "প্রথম মাদরাসা" }, weekStartsOn: 6 },
    { _id: "t2", name: { en: "Second Madrasah", bn: "দ্বিতীয় মাদরাসা" }, weekStartsOn: 6 },
  ],
};

const realModule = await loadSessionContext();
const db = fakeDb(TWO_TENANT_DATA);

// check() is deliberately synchronous (this project's own standing lesson --
// an async check body hides its own failures), so an async setup step is
// awaited OUTSIDE check() and only its already-settled result is asserted
// inside it, the same shape programme-ledger-mutations.mjs uses for its own
// async setup.
let rolesOnlyResult;
try {
  rolesOnlyResult = await realModule.getMyMembershipRoles(db, "uidX");
  check("getMyMembershipRoles() returns a ROLES-ONLY shape -- no tenantName/tenantData", () => {
    assert.equal(rolesOnlyResult.length, 2);
    for (const m of rolesOnlyResult) {
      assert.ok(!("tenantName" in m), `getMyMembershipRoles() must not carry tenantName; got keys ${Object.keys(m)}`);
      assert.ok(!("tenantData" in m), `getMyMembershipRoles() must not carry tenantData; got keys ${Object.keys(m)}`);
    }
  });
} catch (err) {
  check("getMyMembershipRoles() returns a ROLES-ONLY shape -- no tenantName/tenantData", () => { throw err; });
}

let hydratedResult;
try {
  hydratedResult = await realModule.hydrateMemberships(db, rolesOnlyResult);
  check("hydrateMemberships() adds the real tenantName/tenantData for each membership", () => {
    const t1 = hydratedResult.find((m) => m.tenantId === "t1");
    const t2 = hydratedResult.find((m) => m.tenantId === "t2");
    assert.equal(t1.tenantName, "First Madrasah");
    assert.equal(t2.tenantName, "Second Madrasah");
    assert.equal(t1.tenantData.weekStartsOn, 6);
    assert.equal(t1.personId, "p1");
    assert.deepEqual(t1.roles, ["owner", "prime"]);
  });
} catch (err) {
  check("hydrateMemberships() adds the real tenantName/tenantData for each membership", () => { throw err; });
}

try {
  const composed = await realModule.getMyMemberships(db, "uidX");
  check("getMyMemberships() is exactly the composition of the two split functions", () => {
    assert.deepEqual(composed, hydratedResult);
  });
} catch (err) {
  check("getMyMemberships() is exactly the composition of the two split functions", () => { throw err; });
}

check("pickContext(): no stored context, no defaultTenantId -- lands on the FIRST membership", () => {
  globalThis.localStorage.__reset();
  const ctx = realModule.pickContext(rolesOnlyResult, null);
  assert.equal(ctx.tenantId, "t1");
  assert.equal(ctx.personId, "p1");
});

check("pickContext(): a stale defaultTenantId (a tenant the person no longer belongs to) is never used", () => {
  globalThis.localStorage.__reset();
  const ctx = realModule.pickContext(rolesOnlyResult, "t404-no-longer-a-member");
  assert.equal(ctx.tenantId, "t1", `a stale defaultTenantId must fall back to the first real membership, got "${ctx.tenantId}"`);
});

check("pickContext(): an existing stored context for a tenant the person no longer belongs to is never used", () => {
  globalThis.localStorage.__reset();
  globalThis.localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t999-gone", personId: "px", roles: ["owner"], viewAsRole: null }));
  const ctx = realModule.pickContext(rolesOnlyResult, "t2");
  assert.equal(ctx.tenantId, "t2", `a stale stored context must fall through to defaultTenantId/first membership, got "${ctx.tenantId}"`);
});

check("pickContext(): a still-valid stored context wins over defaultTenantId (today's rule)", () => {
  globalThis.localStorage.__reset();
  globalThis.localStorage.setItem("qr.sessionContext", JSON.stringify({ tenantId: "t2", personId: "p2", roles: ["teacher"], viewAsRole: null }));
  const ctx = realModule.pickContext(rolesOnlyResult, "t1");
  assert.equal(ctx.tenantId, "t2", "a still-valid stored tenant must win over a different defaultTenantId");
});

/** Shared assertion, run against both the real and the mutated pickContext(). */
function assertDefaultTenantIdHonoured(pickContextFn) {
  globalThis.localStorage.__reset();
  const ctx = pickContextFn(rolesOnlyResult, "t2");
  assert.equal(ctx?.tenantId, "t2", `expected defaultTenantId "t2" to be honoured, got "${ctx?.tenantId}"`);
}

check("pickContext(): a matching defaultTenantId is honoured when nothing is stored", () => {
  assertDefaultTenantIdHonoured(realModule.pickContext);
});

// ---- THE MUTATION: pickContext() that stops honouring defaultTenantId -----
const MUTATION_TARGET = "const preferred = memberships.find((m) => m.tenantId === defaultTenantId) ?? memberships[0];";
assert.ok(REAL_SOURCE.includes(MUTATION_TARGET),
  "mutation target line not found in app/js/session-context.js -- pickContext() must have been refactored; update this suite's mutation string");
const mutatedSource = REAL_SOURCE.replace(
  MUTATION_TARGET,
  "const preferred = memberships[0]; // MUTATED (session-context-two-tenant.mjs): ignores defaultTenantId on purpose"
);
const mutatedModule = await loadSessionContext(mutatedSource);

check("MUTATION: a pickContext() that ignores defaultTenantId is caught by the check above", () => {
  assert.throws(
    () => assertDefaultTenantIdHonoured(mutatedModule.pickContext),
    /expected defaultTenantId "t2" to be honoured/,
    "the mutated pickContext() (which ignores defaultTenantId) did NOT fail -- the check above is UNPROVEN and must not be trusted"
  );
});

// ---------------------------------------------------------------------------
// PART 2 -- the real page, in a browser, seeded with a uid in two tenants.
// ---------------------------------------------------------------------------

/** The default stub uid ("test-uid") gets a SECOND tenant membership, with a
 *  different role, a different roster and its own trackables -- everything
 *  the app itself would need to actually be usable after switching to it,
 *  not just enough to be queried. */
function twoTenantSeedJs({ defaultTenantId } = {}) {
  const defaultLine = defaultTenantId
    ? `DATA.userIndex.push({ _id: UID, defaultTenantId: ${JSON.stringify(defaultTenantId)} });`
    : "";
  return `
DATA.tenantMemberUids.push({ _id: "t2__" + UID, tenantId: "t2", uid: UID, personId: "p_t2", roles: ["teacher"] });
DATA.tenants.push({ _id: "t2", name: lang("Second Madrasah", "দ্বিতীয় মাদরাসা"), weekStartsOn: 6 });
DATA.tenantPeople.push({ _id: "p_t2", tenantId: "t2", personId: "p_t2", name: lang("Teacher Two", "শিক্ষক দুই"), roles: ["teacher"] });
DATA.trackables = DATA.trackables.concat(APPROACHES.map((a, i) => ({
  _id: "t2__" + a[0], tenantId: "t2", subjectId: "quran", order: i, status: "active",
  name: lang(a[1], a[2]), groupName: lang(a[3], a[4]),
  guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
  panels: ["text", "audio", "loop", "tajweed", "wordByWord"],
})));
${defaultLine}
`;
}

const browser = await chromium.launch();

async function openTwoTenantPage(opts) {
  const ctx = await newContext(browser, {
    banner: false,
    viewport: { width: 390, height: 844 },
    extraSeedJs: twoTenantSeedJs(opts),
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app/quranrevival.html`);
  await page.waitForFunction(() => {
    const app = document.getElementById("app"), wheel = document.getElementById("wheelContainer");
    return !!app && app.style.display !== "none" && !!wheel && !!wheel.querySelector("svg");
  }, null, { timeout: 30000 });
  await page.waitForTimeout(300); // let the tenant picker's own hydration fill-in land
  return { ctx, page };
}

await checkAsync("real page: no stored context, no defaultTenantId -- lands on the FIRST membership (t1)", async () => {
  const { ctx, page } = await openTwoTenantPage();
  try {
    const tenantId = await page.$eval("#tenantSelect", (el) => el.value);
    assert.equal(tenantId, "t1");
    const peopleCount = await page.$eval("#personSelect", (el) => el.options.length);
    assert.equal(peopleCount, 2, "t1's own roster (Ahsan, Maryam) should show");
  } finally {
    await ctx.close();
  }
});

await checkAsync("real page: the tenant picker shows BOTH tenants' real names, never a raw id once loaded", async () => {
  const { ctx, page } = await openTwoTenantPage();
  try {
    const texts = await page.$$eval("#tenantSelect option", (opts) => opts.map((o) => o.textContent));
    assert.equal(texts.length, 2, `expected 2 tenant options, got: ${texts.join(" | ")}`);
    assert.ok(texts.some((tx) => tx.includes("Madrasatul Muslimeen")), `missing the first tenant's real name: ${texts.join(" | ")}`);
    assert.ok(texts.some((tx) => tx.includes("Second Madrasah")), `missing the second tenant's real name: ${texts.join(" | ")}`);
    assert.ok(!texts.some((tx) => /^t1\b|^t2\b/.test(tx)), `a raw tenant id is still showing once loaded: ${texts.join(" | ")}`);
  } finally {
    await ctx.close();
  }
});

await checkAsync("real page: switching tenants shows the right roster and the right roles", async () => {
  const { ctx, page } = await openTwoTenantPage();
  try {
    // Before switching: owner/prime in t1 -- the Admin nav group is present.
    // (renderSettings() always emits its OWN "Settings" .nav-cat-group-label
    // too, so this counts by TEXT, not just the class, or a teacher's single
    // "Settings" label would be misread as "Admin" too.)
    const groupLabelText = () => page.$$eval("#navHomeExtra .nav-cat-group-label", (els) => els.map((e) => e.textContent));
    assert.ok((await groupLabelText()).includes("Admin"), "t1's owner/prime should see the Admin nav group");

    await page.evaluate(() => {
      const sel = document.getElementById("tenantSelect");
      sel.value = "t2";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForFunction(() => document.getElementById("personSelect").options.length === 1, null, { timeout: 10000 });

    const peopleTexts = await page.$$eval("#personSelect option", (opts) => opts.map((o) => o.textContent));
    assert.deepEqual(peopleTexts, ["Teacher Two"], `t2's roster should show only its own person, got: ${peopleTexts.join(", ")}`);

    assert.ok(!(await groupLabelText()).includes("Admin"), "t2's teacher-only role must not see the Admin nav group");

    const tenantValue = await page.$eval("#tenantSelect", (el) => el.value);
    assert.equal(tenantValue, "t2");
  } finally {
    await ctx.close();
  }
});

await checkAsync("real page: a stale defaultTenantId naming a tenant the person no longer belongs to is never used", async () => {
  const { ctx, page } = await openTwoTenantPage({ defaultTenantId: "t404-no-longer-a-member" });
  try {
    const tenantId = await page.$eval("#tenantSelect", (el) => el.value);
    assert.equal(tenantId, "t1", `a stale defaultTenantId must fall back to the first real membership, landed on "${tenantId}" instead`);
    const errorText = await page.$eval("#who", (el) => el.textContent).catch(() => "");
    assert.ok(!/failed at/.test(errorText), `sign-in must not fail over a stale defaultTenantId: ${errorText}`);
  } finally {
    await ctx.close();
  }
});

await checkAsync("real page: a real defaultTenantId is honoured end to end (not just inside pickContext())", async () => {
  const { ctx, page } = await openTwoTenantPage({ defaultTenantId: "t2" });
  try {
    const tenantId = await page.$eval("#tenantSelect", (el) => el.value);
    assert.equal(tenantId, "t2");
    const peopleTexts = await page.$$eval("#personSelect option", (opts) => opts.map((o) => o.textContent));
    assert.deepEqual(peopleTexts, ["Teacher Two"]);
  } finally {
    await ctx.close();
  }
});

await browser.close();
console.log(`\n==== session-context two-tenant safety: ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
