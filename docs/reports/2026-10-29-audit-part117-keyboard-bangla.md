# Audit part 117: the keyboard audit in Bangla (PCF MSA J29, issue #1269)

## What changed

`tools/i18n-verify/shared-pages-keyboard-audit-browser.mjs` (audit part 88) now runs every page a second time in Bangla
(`appLang: "bn"`, the same `REAL_SEED` real-length names), at both 1440x900 and 390x844, on **all 23 shared pages**.
`--no-bn` skips the Bangla pass. Check names carry ` / bn` in Bangla.

A positive control was added: each Bangla page-and-width first checks that its body text really contains Bengali script,
so a Bangla pass over a page that stayed English cannot pass vacuously.

## Before findings (Bangla pass added, nothing else changed)

Run: 23 pages x 2 widths x 2 languages x 5 checks.

| Page | Width | Check | Control |
|---|---|---|---|
| (none) | | | |

**0 findings.** Tab reach, focus trap / Shift+Tab, focus-ring 3:1 contrast, Esc on every disclosure with focus returning
to the opener, and Enter/Space on `role=button` all hold in Bangla exactly as in English. No stale assertion needed
changing. No shared code was changed; nothing was found in frozen or module-owned files, so nothing is listed for the Architect.

## Mutations (must fail in both languages)

Run on `--page=bookmarks`; each fails in English **and** Bangla, at both widths:

- `--mutate=outline`: ring check fails (4 of 4 page/width/language cases).
- `--mutate=tabindex`: Tab reach and trap checks fail (8 failures).
- `--mutate=trap`: trap check fails (4).
- `--mutate=role`: role=button check fails (4).
- `--mutate=esc`: Esc check fails (4).

## After totals

- `shared-pages-keyboard-audit-browser.mjs`: **506 passed, 0 failed** (460 checks + 46 Bangla positive controls).
- `behaviour.mjs` alone: **971 passed, 0 failed**.
- `bn-duplicate-keys.mjs`: 6 passed, 0 failed.
- `table-focus-in-view-browser.mjs`: does not exist on `main`, so not run.
