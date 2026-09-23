# Fix list — three Study-options panel truncations, measured and closed

- **Date:** 2026-09-22
- **Authority:** the Owner's own standing fix-list authorisation, given
  22 Sep 2026 — *"proceed with your recommended fixes on the three
  small-phone items unless I say otherwise."*
- **Version:** v08.33, allocated by the MMSA Architect.
- **Status:** built, measured before and after, real behaviour change.

---

## What was fixed

Three real, previously-measured truncations in the Study-options panel
(`#panelStudyOptions`), all recorded on the pinned fix list before this
round began:

1. **`tenantSelect`** ("User Role") — the owner's own tenant name plus role
   list, `"Madrasatul Muslimeen (Owner, Prime)"`, needing 224px, against
   115–141px usable at every phone width tested (360/390/412).
2. **`unitTypeSelect`/`surahSelect`** (Study Unit / Surah) — the recorded
   Owner Control Gate item O3b, *"the row is genuinely short of space… no
   redistribution reaches it."*
3. **`drillModeSelect`** (the Listen bar's Mode picker) — cut in **Bangla
   only**, at every phone width, item O3c.

## A recommendation corrected before it was built

The fix list, as written, recommended *shortening the wording* for item 1.
**That recommendation does not survive contact with what actually generates
the text.** `tenantSelect`'s options are built in `app/quranrevival.html`
as `` `${m.tenantName} (${roleListLabel(m.roles)})` `` — the tenant's own
name is free text of any length, in any language, chosen by the tenant
itself; the role list uses the exact vocabulary (`Owner`, `Prime`,
`Teacher`, `Guardian`, `Student`, `Platform admin`) every other screen in
the app already shows. There is no safe universal shortening here: either
a real tenant's own chosen name gets truncated, or a new abbreviated role
vocabulary gets invented that nothing else in the app uses. **Recorded
rather than silently substituted** — the layout fix below was built
instead, and this correction is stated here and in the code comment at
`.opt-bar-2` so a later session does not rediscover the same dead end.

## The fix, and why it is a real layout change

**Nothing in the codebase's usual "redistribute the row" remedy (the 18 Sep
nav fit, the number-picker round) could reach `tenantSelect`'s gap** —
measured, its cell needs to roughly double (115px → 254px usable) while its
sibling `personSelect` needs its own real minimum, which two cells sharing
one row at phone width cannot both satisfy. The row must **wrap**, and a
wrap is a real behaviour change: it costs one row of height, so it is a
version bump, not a documentation-only round.

### `tenantSelect` / `personSelect` (`.opt-bar-2`)

Below **580px** — measured, not assumed: this bar's own cellW is exactly
`0.5×viewport − 35px` on this page (fitted from three real data points,
360/390/412px, all on the same 0.5 slope every bar on this page shares), and
a `<select>`'s own chrome (border, padding, native arrow) is a measured
30px. 224px of usable text needs `cellW ≥ 254px`, which needs
`viewport ≥ 578px`. 580px, with a small margin.

```css
@media (max-width: 580px) {
  .opt-bar-2 { grid-template-columns: 1fr; }
}
```

Both cells stack, tenantSelect first. Costs one row's height (~46px) below
580px; byte-identical above it.

### `unitTypeSelect` / `surahSelect` (`.opt-bar-units`)

Below **480px** — the worse of the two unit-type cases (Page/Range, four
cells sharing the row) clears its own need at a measured 468px; Single Ayah
(three cells) clears earlier, at 412px. 480px, with a small margin over the
worse case.

```css
@media (max-width: 480px) {
  .opt-bar-units { flex-wrap: wrap; }
  .opt-bar-units > .opt-cell:not(.opt-cell-num) { flex: 1 1 45%; }
}
```

Study Unit and Surah each claim at least 45% of the row and wrap onto their
own line together; the small fixed-width number pickers (unitNum/Ayah/
From/To — `.opt-cell-num`, untouched, already sized correctly for a short
number) flow to a second line. Costs one row's height below 480px;
unchanged above it.

### `drillModeSelect` (`.opt-bar-listen`)

**Found by running `panel.mjs` in Bangla for the first time.** It had only
ever been run in English — a suite that runs one language measures one
language, the same class of gap this project has found and closed before
(O3c's own discovery, 19 Sep 2026). English was already clean; Bangla's
*"প্রতিটি আয়াত"* needs 54px against 48px usable, at every phone width.

Same technique, same breakpoint (480px, the same panel, the remedy the fix
list itself said to pair it with):

```css
@media (max-width: 480px) {
  .opt-bar-listen { flex-wrap: wrap; }
  .opt-bar-listen > .opt-cell-mode { flex: 1 1 auto; min-width: 8rem; }
}
```

A new class, `opt-cell-mode`, was added to the one markup element that
needed a stable selector — matching the existing `opt-cell-loop`/
`opt-cell-play` convention already used by its two siblings in the same bar.

## Verification — measured before and after, both languages

`tools/i18n-verify/panel.mjs`, both languages, full run (8 viewports × 3
unit types × 2 banner states = 48 sections each), before and after:

| | Before | After |
|---|---|---|
| English | `tenantSelect`, `unitTypeSelect`, `surahSelect` truncated at 360/390/412px | **0 truncations, 48/48 sections clean** |
| Bangla | Same three, plus `drillModeSelect` at every phone width | **0 truncations, 48/48 sections clean** |

The suite's own baseline mechanism confirmed it independently:
`!! a BASELINED truncation no longer occurs: tenantSelect, surahSelect,
unitTypeSelect -- if that is a fix, drop it from KNOWN_TRUNCATED_SELECTS`,
followed by `==== PANEL OK (apart from the known baseline) ====`.
**`KNOWN_TRUNCATED_SELECTS` is now an empty set**, not deleted — so a real
regression at any of these three ids is reported as new rather than
silently re-baselined, and the reason is recorded in the comment above it.

**Desktop and tablet (768px and up) are unaffected** — confirmed in the
same runs: `selects truncated: none` at every viewport from 768px through
1920px, both before and after, byte-for-byte identical panel geometry at
those widths (the new rules are all inside `max-width` media queries that
do not reach them).

## What this deliberately does not touch

- No other bar, cell or breakpoint on the page.
- `personSelect`, `unitNumControl`, `ayahSelectControl`, `rangeControls`,
  `rangeToControls`, `drillRepeatSelect`, the Loop/Play controls — all
  unchanged, and confirmed unchanged by the same measurement runs (no new
  truncation introduced anywhere else on the panel).
- No Firestore write, Rule, index, or protected/shared path.
