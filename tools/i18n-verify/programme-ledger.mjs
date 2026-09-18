// THE REPOSITORY MUST STOP RELYING ON A SESSION NOTICING.
//
// Three coordination facts have each been got wrong by a careful session in the
// space of one day:
//
//   - v08.26 was reported as being on `main` while it was only on a branch;
//   - two independent builds simultaneously carried 08.27, which is precisely
//     the thing a version number exists to prevent;
//   - `CLAUDE.md` forward-allocates 08.28 to the held Phase 4 wiring, in BARE
//     form -- so every v-prefixed scanner in this repository is blind to it --
//     while another stream has already stamped and consumed 08.28 and 08.29.
//
// None of the three was caught by a guard. All three were caught by a person
// reading carefully, which is the failure mode this file exists to retire.
//
// It reads `docs/governance/programme-integration-ledger.json` and compares it
// against the repository as it actually is. The ledger is DATA, not authority:
// it records decisions, it does not make them. Six guards:
//
//   A  two active or reserved streams claiming the same global version
//   B  a branch inventing a version the ledger has not reserved for it
//   C  a held historical branch stamp being read as a future allocation
//   D  malformed or non-canonical version references that blind the scanners
//   E  a module modifying a declared shared/platform file undeclared
//   F  a stale integration baseline -- a candidate based on a main SHA that moved
//
// The guards are a pure function of (ledger, facts) so the mutation suite in
// `programme-ledger-mutations.mjs` can feed them a corrupted ledger and a
// stubbed repository and prove each one really fails. A guard that cannot fail
// is worse than no guard, because it is believed.
//
// Run from the REPOSITORY ROOT:  node tools/i18n-verify/programme-ledger.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const LEDGER_PATH = "docs/governance/programme-integration-ledger.json";

/** The canonical MACHINE form of a version: exactly what app/js/version.js stores. */
export const CANONICAL_VERSION = /^\d{2}\.\d{2}$/;
/** The canonical PROSE form, and the exact shape brief-integrity.mjs scans for. */
export const prosePattern = (v) => new RegExp(`\\bv${v.replace(".", "\\.")}\\b`);
/**
 * A bare version reference in prose -- invisible to every v-prefixed scanner.
 *
 * The trailing guard is `(?!\.?\d)`, NOT `(?![\d.])`. The stricter form
 * rejects a version that ends a sentence ("main was on 08.25.") because the
 * full stop matches the class -- which is the same trailing-full-stop trap that
 * produced a false reading in `brief-integrity.mjs`'s own first run. This form
 * still rejects `08.255` and `08.25.3` while accepting `08.25.` at a full stop.
 * Found by a mutation that went UNPROVEN, not by re-reading the regex.
 */
export const barePattern = (v) => new RegExp(`(?<![v\\d.])${v.replace(".", "\\.")}(?!\\.?\\d)`);

/**
 * The shared-file touch vocabulary. It is CLOSED, and an unrecognised token
 * fails by name rather than falling through to a default.
 *
 * That is not pedantry. The ledger said `AUTHORIZED` and this guard tested for
 * `AUTHORISED`; one letter, and all five of the Hadith stream's Master
 * Architect authorisations were reported every run as "DECLARED, awaiting
 * Master Architect decision" -- a decision that had already been made, shown as
 * still outstanding. A closed set turns that class of near-miss into a loud
 * failure naming the offending token.
 */
export const TOUCH_DECLARED = "DECLARED";
export const TOUCH_AUTHORIZED = "AUTHORIZED";
const TOUCH_STATUSES = new Set([TOUCH_DECLARED, TOUCH_AUTHORIZED]);
/** Who may authorise a shared-file change. Closed: a module cannot authorise itself. */
const AUTHORITIES = new Set(["master-architect"]);

/** Statuses that CLAIM a version. A claimed version is not available to anyone else. */
const CLAIMING = new Set(["LIVE", "RESERVED", "RELEASED"]);
/** Statuses that do NOT claim: a record of what a branch happens to be stamped. */
const NON_CLAIMING = new Set(["HISTORICAL", "HELD"]);

const globToRe = (g) =>
  new RegExp("^" + g.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$");

const matchesAny = (p, globs) => globs.some((g) => globToRe(g).test(p));

const cmpVersion = (a, b) => {
  const [aM, aN] = a.split(".").map(Number);
  const [bM, bN] = b.split(".").map(Number);
  return aM - bM || aN - bN;
};

/**
 * Every version string held in a DATA field, with the path that carries it.
 * Deliberately does NOT walk `$comment` / `note` prose -- those legitimately
 * discuss versions in sentences, and conflating the two is how a guard becomes
 * noise nobody reads.
 */
function dataVersions(ledger) {
  const out = [];
  const push = (where, v) => { if (v !== null && v !== undefined) out.push({ where, value: v }); };
  push("main.version", ledger.main?.version);
  push("nextUnallocated", ledger.nextUnallocated);
  (ledger.versionAllocations || []).forEach((a, i) => push(`versionAllocations[${i}].version`, a.version));
  (ledger.streams || []).forEach((s) => push(`streams[${s.id}].declaredVersion`, s.declaredVersion));
  push("d14.version", ledger.d14?.version);
  return out;
}

/**
 * The guards, as a pure function.
 *
 * `facts` is the repository as measured:
 *   { mainSha, mainVersion, briefText, ancestorOfMain: {sha: bool},
 *     branches: { name: { tip, version, changedPaths: [] } },
 *     fileExists: (p) => bool }
 */
export function runGuards(ledger, facts) {
  const findings = [];
  const fail = (guard, message) => findings.push({ guard, level: "FAIL", message });
  const note = (guard, message) => findings.push({ guard, level: "NOTE", message });
  const pass = (guard, message) => findings.push({ guard, level: "PASS", message });

  const allocations = ledger.versionAllocations || [];
  const streams = ledger.streams || [];
  const streamById = new Map(streams.map((s) => [s.id, s]));

  // ---- POSITIVE CONTROLS -------------------------------------------------
  // Every guard below is a search for something wrong. A broken reader makes
  // all of them pass while seeing nothing at all, which is the one failure the
  // guards cannot report about themselves.
  if (allocations.length < 3) fail("CONTROL", `the ledger yielded only ${allocations.length} version allocations; the reader has stopped working`);
  if (streams.length < 2) fail("CONTROL", `the ledger yielded only ${streams.length} streams; the reader has stopped working`);
  if (!(ledger.platformSharedPaths || []).length) fail("CONTROL", "the ledger declares no platform/shared paths; guard E would pass vacuously");
  if (dataVersions(ledger).length < 5) fail("CONTROL", "fewer than 5 version data fields found; guard D would pass vacuously");
  if (typeof facts.briefText !== "string" || facts.briefText.length < 10000) {
    fail("CONTROL", "CLAUDE.md was not read (or is implausibly short); guards C and D would pass vacuously");
  } else {
    const seen = new Set([...facts.briefText.matchAll(/\bv(0[78]\.\d{2})\b/g)].map((m) => m[1]));
    if (seen.size < 10) fail("CONTROL", `only ${seen.size} v-prefixed versions found in the brief; the prose scanner has stopped working`);
    else pass("CONTROL", `prose scanner sees ${seen.size} v-prefixed versions in the brief`);
  }

  // ---- GUARD A: two streams claiming the same global version -------------
  {
    const byVersion = new Map();
    for (const a of allocations) {
      if (!CLAIMING.has(a.status)) continue;
      if (!byVersion.has(a.version)) byVersion.set(a.version, []);
      byVersion.get(a.version).push(a);
    }
    let collisions = 0;
    for (const [version, rows] of byVersion) {
      const owners = new Set(rows.map((r) => r.owner));
      if (owners.size > 1) {
        collisions++;
        fail("A", `version ${version} is claimed by ${owners.size} streams at once: ${[...owners].join(", ")} (${rows.map((r) => r.status).join("/")})`);
      }
    }
    // Reality, not only self-consistency: what a branch is actually stamped
    // must be a version this ledger says that stream owns.
    for (const s of streams) {
      if (!s.activeBranch) continue;
      const b = facts.branches?.[s.activeBranch];
      if (!b) { note("A", `branch ${s.activeBranch} (stream ${s.id}) is not readable here; its stamp was not cross-checked`); continue; }
      if (b.version !== s.declaredVersion) {
        fail("A", `stream ${s.id} declares ${s.declaredVersion} but ${s.activeBranch} is stamped ${b.version} -- the ledger and the branch disagree`);
      }
    }
    // LIVE means "the version main carries". That is a fact about the
    // repository, so it is checked against the repository -- Quran's 08.27 sat
    // LIVE while main had moved to 08.29, and nothing objected, because the
    // vocabulary was only ever described in prose.
    const live = allocations.filter((a) => a.status === "LIVE");
    if (live.length !== 1) {
      fail("A", `${live.length} allocations are LIVE; exactly one may be (LIVE is the version main carries)`);
    } else if (ledger.main?.version && live[0].version !== ledger.main.version) {
      fail("A", `${live[0].version} (${live[0].owner}) is marked LIVE, but main carries ${ledger.main.version} -- a superseded milestone is RELEASED, not LIVE`);
    }
    if (!collisions && !findings.some((f) => f.guard === "A" && f.level === "FAIL")) {
      pass("A", `no global version is claimed by two streams (${byVersion.size} claiming allocations checked); ${live.length ? live[0].version : "none"} is LIVE and matches main`);
    }
  }

  // ---- GUARD B: a branch inventing an unreserved version -----------------
  {
    const next = ledger.nextUnallocated;
    if (!next) fail("B", "the ledger declares no nextUnallocated; guard B cannot bound anything");
    let checked = 0;
    for (const s of streams) {
      if (!s.activeBranch) continue;
      const b = facts.branches?.[s.activeBranch];
      if (!b) continue;
      checked++;
      const owned = allocations.filter((a) => a.owner === s.id && a.version === b.version);
      if (!owned.length) {
        fail("B", `${s.activeBranch} is stamped ${b.version}, which the ledger reserves for nobody under stream ${s.id} -- an invented version`);
      }
      if (next && cmpVersion(b.version, next) >= 0) {
        fail("B", `${s.activeBranch} is stamped ${b.version}, at or beyond the unallocated boundary ${next} -- allocation is the Master Architect's`);
      }
    }
    for (const a of allocations) {
      if (next && CLAIMING.has(a.status) && cmpVersion(a.version, next) >= 0) {
        fail("B", `the ledger claims ${a.version} for ${a.owner}, at or beyond the unallocated boundary ${next}`);
      }
    }
    if (!findings.some((f) => f.guard === "B" && f.level === "FAIL")) {
      pass("B", `${checked} declared branch stamp(s) are reserved, and nothing claims ${next} or beyond`);
    }
  }

  // ---- GUARD C: a held historical stamp read as a future allocation -------
  {
    const historical = allocations.filter((a) => a.historicalStamp === true);
    if (!historical.length) note("C", "no historical stamp is declared; nothing to confuse");
    for (const a of historical) {
      if (a.forwardAllocation !== false) {
        fail("C", `allocation ${a.version} (${a.owner}) is a historical stamp but does not declare forwardAllocation:false -- it reads as a claim on a future merge number`);
      }
      if (CLAIMING.has(a.status)) {
        fail("C", `allocation ${a.version} (${a.owner}) is a historical stamp carrying claiming status ${a.status}`);
      }
      if (!NON_CLAIMING.has(a.status)) {
        fail("C", `allocation ${a.version} (${a.owner}) is a historical stamp with status ${a.status}, which is neither HISTORICAL nor HELD`);
      }
      // The record must not be fiction: the commit really carries that stamp.
      //
      // Checked against the COMMIT THE STAMP NAMES, not the branch tip. The tip
      // is only the right comparison for a stream with a single stamp that has
      // never moved -- true of the held Phase 4 wiring, false the moment a
      // stream stamps twice on its way to integration, as Hadith did
      // (08.28 at 7f61328, then 08.29). Comparing an intermediate stamp against
      // the tip reported a correct record as fiction. Naming the commit is also
      // strictly stronger: it verifies each stamp where it actually lives.
      const at = a.stampedAt || a.commit;
      if (at) {
        const real = facts.versionAt?.[at];
        if (real === undefined) {
          note("C", `${a.owner}'s historical stamp ${a.version} names commit ${at}, which is not readable here; the stamp was not cross-checked`);
        } else if (real !== a.version) {
          fail("C", `the ledger records ${a.owner}'s historical stamp at ${at} as ${a.version}; that commit actually carries ${real}`);
        }
        continue;
      }
      const s = streams.find((x) => x.id === a.owner);
      const b = s?.activeBranch ? facts.branches?.[s.activeBranch] : null;
      if (b && b.version !== a.version) {
        fail("C", `the ledger records ${a.owner}'s historical stamp as ${a.version}; ${s.activeBranch} actually carries ${b.version} and the stamp names no commit of its own`);
      }
    }
    // THE ONE THAT ACTUALLY HAPPENED. The brief predicts a merge number for a
    // held branch, in the same paragraph as the commit, and that number now
    // belongs to somebody else. Read the brief's own paragraphs rather than
    // trusting that nobody wrote it down.
    //
    // WHAT COUNTS AS A PREDICTION, and this was narrowed on the guard's own
    // first run rather than left as written. A held branch's paragraph quite
    // properly recounts history -- the stamp it carries, and what `main` has
    // taken since. Flagging those produced three false positives against
    // correct prose. A FORWARD number is the defect: a version ABOVE what
    // `main` currently serves, named in the same breath as a held commit, is
    // an allocation nobody made. The brief's own sentence already says so:
    // "Read the number off `main` at the time of the merge rather than
    // trusting this sentence's own arithmetic."
    const claimedBy = new Map();
    for (const a of allocations) if (CLAIMING.has(a.status)) claimedBy.set(a.version, a.owner);
    const mainVersion = ledger.main?.version;
    for (const s of streams) {
      if (s.integrationState !== "HELD" || !s.branchTip) continue;
      const short = s.branchTip.slice(0, 7);
      for (const para of (facts.briefText || "").split(/\n\s*\n/)) {
        if (!para.includes(short)) continue;
        const seen = new Set();
        // `v?` with `\b` cannot reach the digits of "v08.44" (no boundary between
        // `v` and `0`), so the two forms are matched separately rather than
        // cleverly. And the trailing guard is `(?!\.?\d)` for the reason given
        // on `barePattern`: a number ending a sentence is still a number.
        for (const m of para.matchAll(/(?<![\d.])(\d{2}\.\d{2})(?!\.?\d)/g)) seen.add(m[1]);
        for (const v of seen) {
          if (!mainVersion || cmpVersion(v, mainVersion) <= 0) continue;   // history, not a prediction
          const owner = claimedBy.get(v);
          fail("C", owner && owner !== s.id
            ? `the brief's paragraph about held commit ${short} names ${v}, which is ahead of main (${mainVersion}) and claimed by stream "${owner}" -- a held branch's merge number is not predictable and must not be written as one`
            : `the brief's paragraph about held commit ${short} names ${v}, ahead of main (${mainVersion}) -- that is a forward allocation, and allocation is the Master Architect's`);
        }
      }
    }
    if (!findings.some((f) => f.guard === "C" && f.level === "FAIL")) {
      pass("C", `${historical.length} historical stamp(s) declared non-forward, and no held branch is given a predicted merge number in the brief`);
    }
  }

  // ---- GUARD D: malformed / non-canonical version references -------------
  {
    for (const { where, value } of dataVersions(ledger)) {
      if (typeof value !== "string" || !CANONICAL_VERSION.test(value)) {
        fail("D", `${where} = ${JSON.stringify(value)} is not the canonical machine form NN.NN`);
      }
    }
    // THE 08.28-versus-v08.28 PROBLEM, stated exactly. A version named in the
    // brief ONLY in bare form cannot be seen by brief-integrity.mjs, by the
    // milestone check, or by anything else that scans for `v`. It is a version
    // reference that the repository's own integrity scanning is blind to.
    const brief = facts.briefText || "";
    for (const { version } of allocations.map((a) => ({ version: a.version }))) {
      const bare = barePattern(version).test(brief);
      const prose = prosePattern(version).test(brief);
      if (bare && !prose) {
        fail("D", `the brief names ${version} only in BARE form; every v-prefixed scanner in this repository is blind to it. Write it as v${version} at least once.`);
      }
    }
    if (!findings.some((f) => f.guard === "D" && f.level === "FAIL")) {
      pass("D", "every ledger version is canonical in data, and every one the brief mentions is visible to a v-prefixed scanner");
    }
  }

  // ---- GUARD E: undeclared modification of a shared/platform file --------
  {
    const shared = [
      ...(ledger.platformSharedPaths || []).map((r) => r.path),
      ...(ledger.deploymentSecuritySharedPaths || []).map((r) => r.path),
    ];
    const surfaces = new Map((ledger.moduleContentSurfaces || []).map((m) => [m.path, m.owner]));
    let checked = 0, declared = 0, authorized = 0;

    /**
     * Validate a touch RECORD, independently of whether its branch is still
     * diffable. A merged stream's branch shows no changed paths, so without
     * this every authorization it recorded would stop being checked the moment
     * it landed -- the vocabulary would be validated only while it least
     * mattered. Returns the reason it is invalid, or null.
     */
    const touchRecordFault = (t) => {
      if (!TOUCH_STATUSES.has(t.status)) {
        return `carries status "${t.status}" -- not one of ${[...TOUCH_STATUSES].join(" / ")}. A status this guard does not recognise is a touch nobody is tracking.`;
      }
      if (t.status !== TOUCH_AUTHORIZED) return null;
      const a = t.authorization;
      if (!a || typeof a !== "object") return `claims ${TOUCH_AUTHORIZED} with no authorization metadata -- it must carry { by, on, reference }`;
      const missing = ["by", "on", "reference"].filter((k) => !a[k]);
      if (missing.length) return `is ${TOUCH_AUTHORIZED} but is missing authorization ${missing.join(", ")}`;
      if (!AUTHORITIES.has(a.by)) return `claims authorization by "${a.by}", which is not a recognised authority (${[...AUTHORITIES].join(", ")}) -- a module cannot authorise itself`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.on)) return `dates its authorization "${a.on}", which is not YYYY-MM-DD`;
      return null;
    };

    // Validate AND REPORT from the records, not from the branch diffs. A merged
    // stream's branch shows no changed paths, so reporting from the diff alone
    // made every authorisation vanish from the output the moment it landed --
    // found by this suite's own positive control, which asked the guard to show
    // an AUTHORIZED touch and got only DECLARED ones back.
    let records = 0;
    for (const s of streams) {
      for (const t of s.declaredSharedTouches || []) {
        records++;
        const fault = touchRecordFault(t);
        if (fault) { fail("E", `stream ${s.id}'s touch of ${t.path} ${fault}`); continue; }
        if (t.status === TOUCH_AUTHORIZED) {
          const a = t.authorization;
          if (facts.fileExists && !facts.fileExists(a.reference, s.activeBranch)) {
            fail("E", `stream ${s.id}'s ${TOUCH_AUTHORIZED} touch of ${t.path} cites ${a.reference}, which does not exist -- an authorization must be traceable to a record`);
            continue;
          }
          authorized++;
          note("E", `stream ${s.id} modifies shared file ${t.path} -- ${TOUCH_AUTHORIZED} by ${a.by} on ${a.on} (${a.reference})`);
        } else {
          declared++;
          note("E", `stream ${s.id} modifies shared file ${t.path} -- ${TOUCH_DECLARED}, awaiting Master Architect decision. ${t.note || ""}`.trim());
        }
      }
    }
    if (!records) fail("CONTROL", "no shared-file touch records were read; guard E's vocabulary checks would pass vacuously");
    for (const s of streams) {
      if (!s.activeBranch) continue;
      const b = facts.branches?.[s.activeBranch];
      if (!b) continue;
      const own = s.ownedPaths || [];
      const disclosed = new Map((s.declaredSharedTouches || []).map((t) => [t.path, t]));
      for (const p of b.changedPaths || []) {
        if (surfaces.get(p) === s.id) continue;       // its own content surface
        if (matchesAny(p, own)) continue;             // its own declared paths
        if (!matchesAny(p, shared)) continue;         // not a shared file at all
        checked++;
        const t = disclosed.get(p);
        if (!t) {
          fail("E", `stream ${s.id} modifies shared/platform file ${p} on ${s.activeBranch} with no declaration and no authorization -- raise a SHARED CHANGE REQUEST`);
          continue;
        }
        // Disclosed. Its vocabulary, metadata and reporting are handled above,
        // where they stay visible after the branch merges.
      }
    }
    if (!findings.some((f) => f.guard === "E" && f.level === "FAIL")) {
      pass("E", `${records} shared-file touch record(s): ${authorized} ${TOUCH_AUTHORIZED}, ${declared} ${TOUCH_DECLARED} (awaiting decision). ${checked} live modification(s) seen across declared branches, 0 undeclared`);
    }
  }

  // ---- GUARD F: a stale integration baseline -----------------------------
  {
    const anc = facts.ancestorOfMain || {};
    const mainSha = facts.mainSha;
    const mb = ledger.main?.baselineSha;
    if (!mb) fail("F", "the ledger records no main baseline SHA");
    else if (anc[mb] === false) {
      fail("F", `the ledger's main baseline ${mb.slice(0, 10)} is NOT an ancestor of origin/main -- history was rewritten, or the record names a commit from elsewhere`);
    } else if (mb !== mainSha) {
      note("F", `main has moved past the ledger's recorded baseline ${mb.slice(0, 10)} (now ${String(mainSha).slice(0, 10)}). Forward movement, not drift.`);
    }
    if (ledger.main?.version && facts.mainVersion && ledger.main.version !== facts.mainVersion) {
      fail("F", `the ledger records main at ${ledger.main.version}; app/js/version.js on main reads ${facts.mainVersion}`);
    }
    for (const s of streams) {
      if (!s.baselineSha) continue;
      if (anc[s.baselineSha] === false) {
        fail("F", `stream ${s.id} claims baseline ${s.baselineSha.slice(0, 10)}, which is not an ancestor of origin/main`);
        continue;
      }
      if (s.baselineSha === mainSha) continue;
      if (s.baselineStatus !== "MOVED_ACKNOWLEDGED") {
        fail("F", `stream ${s.id} is based on ${s.baselineSha.slice(0, 10)} but origin/main is ${String(mainSha).slice(0, 10)} -- STALE BASELINE, and baselineStatus is "${s.baselineStatus}" rather than MOVED_ACKNOWLEDGED`);
      } else if (s.baselineAcknowledgement && facts.fileExists && !facts.fileExists(s.baselineAcknowledgement, s.activeBranch)) {
        fail("F", `stream ${s.id} acknowledges its moved baseline by pointing at ${s.baselineAcknowledgement}, which does not exist`);
      } else {
        note("F", `stream ${s.id} baseline ${s.baselineSha.slice(0, 10)} has moved to ${String(mainSha).slice(0, 10)} -- acknowledged in ${s.baselineAcknowledgement || "the ledger"}; re-authorisation is the Master Architect's`);
      }
    }
    if (!findings.some((f) => f.guard === "F" && f.level === "FAIL")) {
      pass("F", "every declared baseline is an ancestor of origin/main, and every moved one is acknowledged");
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// CLI: measure the repository, then run the pure guards against it.
// ---------------------------------------------------------------------------
export function measure(root) {
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
  // stdio: git's own "fatal: ..." chatter for an absent ref is expected here and
  // is not a finding; letting it reach the terminal makes a clean run look dirty.
  const tryGit = (...a) => { try { return execFileSync("git", a, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
  const ledger = JSON.parse(fs.readFileSync(path.join(root, LEDGER_PATH), "utf8"));

  const mainSha = tryGit("rev-parse", ledger.main?.ref || "origin/main");
  const versionOf = (ref) => {
    const src = tryGit("show", `${ref}:app/js/version.js`);
    const m = src && src.match(/APP_VERSION\s*=\s*"([\d.]+)"/);
    return m ? m[1] : null;
  };

  const branches = {};
  for (const s of ledger.streams || []) {
    if (!s.activeBranch) continue;
    const ref = tryGit("rev-parse", `origin/${s.activeBranch}`) ? `origin/${s.activeBranch}` : (tryGit("rev-parse", s.activeBranch) ? s.activeBranch : null);
    if (!ref) continue;
    const tip = git("rev-parse", ref);
    const base = tryGit("merge-base", ref, ledger.main?.ref || "origin/main");
    const changed = base ? git("diff", "--name-only", base, ref).split("\n").filter(Boolean) : [];
    branches[s.activeBranch] = { tip, version: versionOf(ref), changedPaths: changed };
  }

  // Every commit a historical stamp names, so guard C can check the stamp where
  // it actually lives rather than against a branch tip that has moved on.
  const versionAt = {};
  for (const a of ledger.versionAllocations || []) {
    const at = a.stampedAt || a.commit;
    if (!at || versionAt[at] !== undefined) continue;
    const v = versionOf(at);
    if (v !== null) versionAt[at] = v;
  }

  const ancestorOfMain = {};
  const shas = [ledger.main?.baselineSha, ...(ledger.streams || []).map((s) => s.baselineSha)].filter(Boolean);
  for (const sha of shas) {
    try { execFileSync("git", ["merge-base", "--is-ancestor", sha, mainSha], { cwd: root }); ancestorOfMain[sha] = true; }
    catch { ancestorOfMain[sha] = false; }
  }

  return {
    ledger,
    facts: {
      mainSha,
      mainVersion: versionOf(ledger.main?.ref || "origin/main"),
      briefText: fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8"),
      branches,
      versionAt,
      ancestorOfMain,
      // An acknowledgement legitimately lives on the stream's OWN branch, not
      // on main -- which is where the guard's first run went looking and
      // reported a real file as missing. Try the branch first, then the tree.
      fileExists: (p, branch) => {
        if (branch && tryGit("cat-file", "-e", `origin/${branch}:${p}`) !== null) return true;
        if (branch && tryGit("cat-file", "-e", `${branch}:${p}`) !== null) return true;
        return fs.existsSync(path.join(root, p));
      },
    },
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const { ledger, facts } = measure(root);
  const findings = runGuards(ledger, facts);
  const order = { FAIL: 0, NOTE: 1, PASS: 2 };
  for (const f of findings.sort((a, b) => order[a.level] - order[b.level] || a.guard.localeCompare(b.guard))) {
    console.log(`  ${f.level.padEnd(4)} [${f.guard}] ${f.message}`);
  }
  const failed = findings.filter((f) => f.level === "FAIL").length;
  const notes = findings.filter((f) => f.level === "NOTE").length;
  const passed = findings.filter((f) => f.level === "PASS").length;
  console.log(`\n==== Programme integration ledger: ${passed} passed, ${notes} noted, ${failed} failed ====`);
  console.log(`     main ${String(facts.mainSha).slice(0, 10)} at v${facts.mainVersion} | ledger ${LEDGER_PATH}`);
  process.exit(failed === 0 ? 0 : 1);
}
