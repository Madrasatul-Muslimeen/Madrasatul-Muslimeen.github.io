# Audit part 79 — regression sweep of the 10 `mushaf-*` suites (PCF MSA J29)

24 Oct 2026, run by the MSA Architect (session_01B9Hi1rr2d2qrrWup4feqnB) on `main` v12.55/v12.56, port 8080. Report only:
**no app or test file changed**, so no version. The Mushaf view is the QR Lead's (`app/quranrevival.html`).

| Suite | Result | Note |
|---|---|---|
| mushaf-approach-cards-browser | 114/0 | green |
| mushaf-bookmark-stay-qcr-add-browser | crashed (TimeoutError), twice, at different steps ([en 390] the first run, [bn 1280] the second, run alone) | **real, QR Lead's file** — below |
| mushaf-chosen-unit-browser | 25/0 | green |
| mushaf-even-lines-browser | 48/0 | green |
| mushaf-font-offline-cache-browser | 29/0 | green |
| mushaf-no-sideways-overflow-browser | 648/0 | green |
| mushaf-page-ref-browser | 129/0 | green |
| mushaf-page-ref-steady-browser | 48/0 | green |
| mushaf-tajweed-font-browser | 96/0 | green |
| mushaf-tools-card-browser | 212/0 | green |

## mushaf-bookmark-stay-qcr-add-browser — a 🔖 tap waits ~6 s for the whole-surah Mushaf to finish drawing

**What the suite saw.** `tapBookmark()` waits 2.5 s for `.bm-popover`; when none comes it does not save, so the
"POSITIVE CONTROL -- the 🔖 changed" check fails, and the pop-up then opens late and its overlay intercepts the next
tap for 30 s (the TimeoutError). Which step it lands on varies from run to run.

**Measured** (probe on the suite's own setup: Read view, Al-Baqarah, Whole Surah, Mushaf on, scrolled to page 4,
`latencyMs` 0, so Firestore answers instantly):

| run | pages drawn at the tap → when the pop-up opened | 🔖 tap → pop-up | long tasks between |
|---|---|---|---|
| en 1280x800 | 32 → 48 | 6,473 ms | 34, 52–394 ms each |
| bn 1280x800 | 32 → 48 | 5,969 ms | 32, 50–278 ms each |
| bn 390x844 | 33 → 48 | 5,521 ms | 27, 62–277 ms each |
| bn 1280x800, three more runs | — | 6,306 / 6,126 / 5,834 ms | — |

The pop-up opens only once the page-by-page render of all 48 pages has finished; a trivial `page.evaluate` still
answers in ~300 ms, so the page is not frozen, but the 🔖 handler's work is queued behind the render, and the render
itself is ~30 long tasks (the page is janky for those ~6 s). The suite was written when the render finished well
inside its waits. **Not environmental** (no network; it repeats in both languages and at both widths).

**Who feels it:** a reader who opens a long surah in the Mushaf view and taps 🔖 (or, likely, any tool that waits on
the same queue) in the first ~6 s. Not blocking (the pop-up does come), but a 6 s dead tap reads as broken.

**Proposed (QR Lead):** let the 🔖 pop-up open without waiting for the remaining pages (it needs only the page in
view), and/or draw the remaining pages in smaller idle-time chunks (`requestIdleCallback` / `scheduler.yield()`
between pages) so no task passes 50 ms; then tighten the suite's wait to a measured bound. Sent to the QR Lead.

**Totals:** 9 of 10 green (1,349 checks, 0 failed); 1 red for the real delay above.
