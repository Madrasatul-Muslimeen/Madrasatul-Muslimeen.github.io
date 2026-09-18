// THE STANDING BRIEF MUST NOT POINT AT THINGS THAT DO NOT EXIST.
//
// CLAUDE.md is read in full at the start of every session and is treated as
// authority. Its own text records that it has been wrong about itself more than
// once:
//
//   - the version line "has drifted twice already -- it read v08.02 while main
//     was on 08.04, and v08.19 while main was on 08.21. Check it against
//     app/js/version.js every session";
//   - it pointed at a deployment document that is not on main, which the Owner
//     would have followed to nothing;
//   - v07.124-128 were found missing from CHANGELOG.md, having only ever lived
//     in the brief, so the next round to trim it would have destroyed them.
//
// "Check it every session" is a thing a session has to remember. This does not.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.argv[2] || process.cwd());
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const brief = read("CLAUDE.md");
const changelog = read("CHANGELOG.md");

let passed = 0, failed = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") throw new TypeError("check() is synchronous; an async body would hide its own failures.");
    passed++; console.log(`  PASS  ${name}`);
  } catch (err) { failed++; console.log(`  FAIL  ${name}\n        ${err.message}`); }
}

/** Every backticked token in the brief that is unmistakably a repository path. */
function briefPaths() {
  const out = new Set();
  for (const m of brief.matchAll(/`([^`\s]+)`/g)) {
    const token = m[1];
    if (/^(app\/js\/[\w.-]+\.(js|json)|tools\/[\w./-]+\.(mjs|js|json|py|rules)|docs\/[\w./-]+\.(md|html|json|rules)|tests\/[\w./-]+\.[\w]+)$/.test(token)) {
      out.add(token);
    }
  }
  return [...out];
}

const paths = briefPaths();

check("POSITIVE CONTROL: the scanner really finds repository paths in the brief", () => {
  // One broken regex here makes every assertion below vacuous.
  assert.ok(paths.length >= 20, `found only ${paths.length} paths in CLAUDE.md; the scanner has stopped working`);
  assert.ok(paths.some((p) => p.startsWith("app/js/")), "no app/js path found");
  assert.ok(paths.some((p) => p.startsWith("tools/")), "no tools path found");
  assert.ok(paths.some((p) => p.startsWith("docs/")), "no docs path found");
});

// The brief legitimately names files that are DELIBERATELY NOT ON `main` --
// the keyed Activity writer's material, held on a development branch and said
// so in the brief's own header. Those are not dead pointers, so rather than
// skipping them this check does the stronger thing: it confirms they really
// are on the branch the brief names. A file that is on neither is dead either
// way.
const HELD_ELSEWHERE = {
  "tests/firestore/activity-v1.proposed.rules": "claude/pensive-knuth-2pu3jj",
};
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

check("every repository path the brief names exists on main", () => {
  const dead = paths.filter((p) => !fs.existsSync(path.join(root, p)) && !(p in HELD_ELSEWHERE));
  assert.deepEqual(dead, [],
    `the brief points at ${dead.length} file(s) that do not exist: ${dead.join(", ")}`);
});

check("...and the ones the brief says are held on a branch really are on it", () => {
  for (const [file, branch] of Object.entries(HELD_ELSEWHERE)) {
    if (fs.existsSync(path.join(root, file))) {
      throw new Error(`${file} is on main now -- drop it from HELD_ELSEWHERE, and check the brief still describes it correctly`);
    }
    try {
      git("cat-file", "-e", `origin/${branch}:${file}`);
    } catch {
      throw new Error(`the brief says ${file} is on ${branch}; it is on neither that branch nor main`);
    }
  }
});

check("the brief's own version claim matches app/js/version.js", () => {
  // STRENGTHENED 18 Sep 2026, on the Owner's own catch, after the drift this
  // check exists for happened a THIRD time in a new shape.
  //
  // The regex used to hard-code the phrase "on `main`", so the check could only
  // ever compare the milestone version against the WORKING TREE. That is fine
  // while the working tree IS main, and silently wrong the moment it is a
  // branch: a session that bumped version.js on a branch wrote "v08.26 on
  // `main`" and this check passed, because the working tree really did say
  // 08.26. It had no way to notice that `main` said 08.25 and that the line was
  // asserting a merge which had not happened.
  //
  // A version bump on a branch is not a version on `main`. So: parse whichever
  // ref the line actually names, and when that ref is not `main`, REQUIRE the
  // line to state main's own version as well and check it against `main`
  // itself. Both halves are verified against something real.
  const actual = read("app/js/version.js").match(/APP_VERSION\s*=\s*"([\d.]+)"/);
  assert.ok(actual, "APP_VERSION not found in app/js/version.js");
  const claimed = brief.match(/\*\*Current milestone:\s*v(\d+\.\d+)\s+on\s+`([^`]+)`/);
  assert.ok(claimed, "CLAUDE.md has no 'Current milestone: vNN.NN on `<ref>`' line to check");
  const [, claimedVersion, claimedRef] = claimed;
  assert.equal(claimedVersion, actual[1],
    `the brief says v${claimedVersion} and app/js/version.js says ${actual[1]} -- this exact drift has happened twice before`);

  // Resolve what `main` ACTUALLY says, every time -- this is the fact the old
  // check never consulted.
  const onMainRaw = git("show", "origin/main:app/js/version.js").match(/APP_VERSION\s*=\s*"([\d.]+)"/);
  assert.ok(onMainRaw, "APP_VERSION not found in origin/main:app/js/version.js");
  const onMain = onMainRaw[1];

  if (claimedRef === "main") {
    // A claim ABOUT main is checked AGAINST main. The first attempt at this
    // strengthening returned early here and compared only the working tree,
    // which still let the original defect through: on a branch whose tree
    // reads 08.26, "v08.26 on `main`" passed while main said 08.25. Proven by
    // mutation -- that exact wording was reinstated and the check stayed green.
    //
    // The one legitimate exception is a session working ON main whose bump is
    // committed locally or not yet pushed: there the working tree IS the
    // future main, and the comparison above already covers it.
    const head = git("rev-parse", "--abbrev-ref", "HEAD");
    assert.ok(head === "main" || onMain === claimedVersion,
      `the brief says v${claimedVersion} is on \`main\`, but origin/main:app/js/version.js says ${onMain} ` +
      `and this tree is on \`${head}\`, not main -- a version bump on a BRANCH is not a version on main`);
    return;
  }
  // The milestone names a BRANCH. Its own claim about main must be stated and
  // must be true -- this is the half that was missing.
  const mainClaim = brief.match(/\*\*Current milestone:[\s\S]{0,240}?`main`\s+is\s+still\s+v(\d+\.\d+)/);
  assert.ok(mainClaim,
    `the milestone line names the branch \`${claimedRef}\` rather than main, so it MUST also state main's own version ` +
    '("`main` is still vNN.NN") -- otherwise a reader cannot tell what is actually shipped');
  assert.equal(mainClaim[1], onMain,
    `the brief says main is still v${mainClaim[1]}; origin/main:app/js/version.js says ${onMain} -- ` +
    "the milestone line is claiming a merge state that is not real");
});

check("the three reachable lines the brief names are all present", () => {
  for (const p of ["legacy/index.html", "legacy-v07/index.html", "app/index.html"]) {
    assert.ok(fs.existsSync(path.join(root, p)), `${p} is named in the brief's own table and is missing`);
  }
});

check("the unmerged wiring candidate the brief names still exists at the commit it names", () => {
  const named = brief.match(/on\s*\n?`?(claude\/phase4-wiring)`?\s*at\s*\*\*`([0-9a-f]{7,40})`\*\*/);
  if (!named) { console.log("        (the brief no longer names an unmerged wiring branch -- nothing to check)"); return; }
  const [, branch, sha] = named;
  const head = git("rev-parse", `origin/${branch}`);
  assert.ok(head.startsWith(sha),
    `the brief says ${branch} is at ${sha}; origin/${branch} is at ${head.slice(0, 10)}`);
});

check("every version the brief names is also in CHANGELOG.md -- nothing lives only in the brief", () => {
  // The rule that exists because v07.124-128 were found missing from the log,
  // having only ever lived here: a round leaving the brief is appended to
  // CHANGELOG.md FIRST, so trimming the brief can never destroy one.
  const current = read("app/js/version.js").match(/APP_VERSION\s*=\s*"([\d.]+)"/)[1];
  const versions = new Set([...brief.matchAll(/\bv(0[78]\.\d{2})\b/g)].map((m) => m[1]));
  assert.ok(versions.size >= 10, `found only ${versions.size} version references; the scanner has stopped working`);
  // A version AHEAD of the current one is a forward reference ("the next
  // feature round is v08.03"), not a round that has gone missing.
  const shipped = [...versions].filter((v) => v <= current);
  assert.ok(shipped.length >= 10, `only ${shipped.length} shipped versions named; the comparison has stopped working`);
  // CHANGELOG.md heads a multi-version round with a RANGE ("v08.05-v08.13"),
  // so a version inside one is covered without appearing literally. Expand the
  // ranges before looking for gaps, or seven false positives bury the two real
  // ones -- which is exactly what this check's own first run produced.
  const covered = new Set([...changelog.matchAll(/v(\d\d\.\d\d)/g)].map((m) => m[1]));
  for (const m of changelog.matchAll(/v(\d\d)\.(\d\d)[\u2013\u2014-]v?(\d\d)\.(\d\d)/g)) {
    const [, majA, minA, majB, minB] = m;
    if (majA !== majB) continue;
    for (let i = Number(minA); i <= Number(minB); i++) covered.add(`${majA}.${String(i).padStart(2, "0")}`);
  }
  const missing = shipped.filter((v) => !covered.has(v));
  assert.deepEqual(missing.sort(), [],
    `${missing.length} version(s) appear in the brief and NOT in CHANGELOG.md: ${missing.join(", ")}`);
});

check("the brief still tells a session where the authoritative status lives", () => {
  // Cheap, but this pointer has been stale before and it is the one a new
  // session follows before anything else.
  assert.ok(brief.includes("PHASE-5-STATUS.md"), "the brief no longer points at PHASE-5-STATUS.md");
  assert.ok(fs.existsSync(path.join(root, "PHASE-5-STATUS.md")), "PHASE-5-STATUS.md is missing");
});

console.log(`\n==== Standing brief integrity: ${passed} passed, ${failed} failed ====`);
process.exit(failed === 0 ? 0 : 1);
