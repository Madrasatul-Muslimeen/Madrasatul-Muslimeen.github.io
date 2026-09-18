# QuranRevival Active Governance

**Status:** ACTIVE  
**Established:** 2026-09-10

This folder contains concise, non-sensitive governance required for controlled implementation. Full reports and audits remain in the Owner-controlled durable archive and are not duplicated here.

## Authority

1. Explicit current Owner decision.
2. MASTER ARCHITECT BASELINE LOCK.
3. QuranRevival Master Architect Plan (MAP) v4.
4. Accepted Master Architect controls.
5. Owner-accepted reports/audits.
6. Current code/config/data contracts as evidence of reality.
7. Repository operational documentation.
8. Accepted historical evidence.
9. Legacy/parked/superseded material.
10. Comments, TODOs, and generated snapshots.

Normative intent flows downward; evidence of reality flows upward. A lower source may expose drift but may not silently override higher authority.

## Operating principles

- **PRESERVE → RECONCILE → EXTEND**
- **INSTRUCT → IMPLEMENT → REPORT → AUDIT → ACCEPT → NEXT INSTRUCTION**
- Continue autonomously only after ACCEPT and only when no Owner Control Gate is crossed.
- Deferred means STOP/ASK; it never authorises implementation.
- BR-4 and BR-5 require explicit Owner authority.
- Firestore production-versus-repository Rules parity is **VERIFIED** (2026-09-10): content-identical, with one additional terminal newline in the repository copy. No Rules modification, implementation proposal, or deployment is authorised.

## Documents

- `ACTIVE-ARCHITECTURE.md` — current concise architecture boundary.
- `adr/` — accepted decisions needed for safe sequencing and early MAP prerequisites.
- `DDR.md` — inactive deferred decisions; no item is activated by being recorded.
- `programme-integration-ledger.json` — **the machine-readable programme coordination record** (established 2026-09-18): the current `main` baseline and version, every stream and its active branch, every allocated and reserved application version with its status, module-owned and platform/shared path families, deployment/security shared paths, deferred shared-change requests, and closed integration gates. It is **data, not authority** — it records decisions the Master Architect has made and does not make them. `tools/i18n-verify/programme-ledger.mjs` reads it and fails when the repository and the record disagree; `programme-ledger-mutations.mjs` proves each of its six guards can fail.

## Programme coordination — ownership at a glance

Recorded in the ledger and reproduced here because it is read more often than it is edited.

| File | Owner | Note |
|---|---|---|
| `app/js/version.js` | **Master Architect — global authority** | No stream allocates a number for itself. |
| `CLAUDE.md` | Platform — governance, shared | Append in your own region; never rewrite another stream's. |
| `CHANGELOG.md` | Platform — release history, shared | A round leaving the brief is appended here first. |
| `app/js/i18n/bn.js` | Platform — shared translation catalogue | Every module adds keys to the same file. |
| `tools/i18n-verify/behaviour.mjs` | Platform — shared verification infrastructure | See SCR-01 in the ledger. |
| `app/hadith-study.html` | Hadith — module content surface | The common navigation and page shell inside it remain **platform-owned**. |

**The SHARED CHANGE RULE.** If a module's work requires modifying a declared shared or platform file and no shared-change authorisation exists, STOP that portion and raise a SHARED CHANGE REQUEST — file, current owner-use, required change, reason, expected blast radius, other modules potentially affected. Do not silently take ownership. Guard E fails on any undeclared shared-file modification by a declared stream.
