# Audit — do Catalogue edits to Approaches reach every screen?

Issue #384, 29 Sep 2026. **Report only; no file under `app/` was changed.** Read at `main` `3cbbdb12`, before the Architect's parallel "number by position" fix lands, so every `order`-as-number finding below is what that fix is meant to remove. Static read of source only; no browser run, no Firestore access. `legacy/` and `legacy-v07/` skipped.

## How Catalogue edits are stored (the facts every row rests on)

| Catalogue action | Where it is written | File:line |
|---|---|---|
| Rename / Guide / section move | the tenant's own `trackables/{tenant}__{id}` doc: `name`, `guide`, `group` + `groupName` (moved together), `edited:true` | `catalogue.html:1360-1400`, `js/catalogue.js:438` |
| Position | `order` on the `trackables` docs, renumbered 1..N in display order | `js/catalogue.js:611`, `catalogue.html:1183-1240` |
| Remove / Restore | `status: "archived"` / `"active"` on the same doc | `catalogue.html:1405+` |
| Add | new `trackables` doc, `sourceTemplateId:null`, `edited:true`, `countsForEachAyah:false` | `js/catalogue.js:576` |
| "Counts for each āyah" | `countsForEachAyah` (bool) on the trackable | `js/catalogue.js:637` |
| Section names / order / add | `approachSections` on the **tenant document**, plus `group`/`groupName` rewritten on each affected trackable | `js/catalogue.js:664-735` |
| List heading | `approachListTitle` on the tenant document | `js/catalogue.js:693-703` |

Every screen gets Approaches through `getTrackables()` (tenant's own docs, sorted by `order`, `js/catalogue.js:300`). `APPROACH_TEMPLATES` (`js/catalogue-data.js:222`) is **only** used by seeding and by `syncUnneditedTrackableNames()` (both in `js/catalogue.js`, lines 161, 325, 814), and the latter skips any doc with `edited:true`. No display screen reads a template. There is **no literal "30" or "7" driving any Approach list or ring** in `app/` code; the only literal mentions are comments, the feature-registry label and one `bn.js` string.

## The table

`quranTrackables` = `getTrackables()` filtered `subjectId==="quran" && status!=="archived"` (`quranrevival.html:7382`). "Reaches" = does a Catalogue edit reach it.

| # | Place | file:line | Shows | Reads from | Reaches? / why |
|---|---|---|---|---|---|
| 1 | Landing wheel — slice numbers | `quranrevival.html:7631` | number on each slice | tenant `trackable.order` | **PARTLY** — names/status/removal/add follow; the **number is the stored `order`**, not position |
| 2 | Landing list (sidebar), grouped | `quranrevival.html:7693-7712` | section headings + rows | `groupApproachesBySection(…, sectionsFromTenantDoc(tenantDoc))`, `includeEmpty` once tenant owns sections | Names, sections, empty sections, removal: **YES**. Row number `trackable.order` (line 7707): **PARTLY** |
| 3 | Landing "All units" rings — numbers ring and header | `quranrevival.html:7909-7928` | `tr.order` on each ring label; `<h3>` "N. name" | `order` | **PARTLY** — names/○ mark follow; numbers are stored `order`. Ring order is `quranTrackables` (flat `order`), not section-grouped |
| 4 | Landing capsule heading | `quranrevival.html:5957-5967`, markup `:3805` | "Quran Approaches - 40 Ways" | tenant doc `approachListTitle` (default constant in `catalogue.js:693`) | **YES** (v08.112). Before the tenant loads, the markup's English default shows, then is replaced |
| 5 | Study-options Approach picker + Note view's Approach `<select>` | `quranrevival.html:6334-6357` (`buildTrackableOptionsHtml`), used at `:6392`, `:17670` | optgroups + names | `quranTrackables`, grouped by **stored `group` number**, label from the **first item's denormalized `groupName`** | **PARTLY** — rename, move, remove, add: YES. Does **not** consult the tenant's section list, so it depends on `group`/`groupName` being kept in step (see NO-3). No numbers shown |
| 6 | Cards' Approach pull-down (Ayah / Unit / "This page") | `quranrevival.html:6364-6376` (`buildCardApproachOptionsHtml`), `:15232`, `:15590` | optgroup by section, "Name · stage" | `groupApproachesBySection(quranTrackables, sectionsFromTenantDoc(tenantDoc))` | **YES** (section names/order, rename, removal, add) |
| 7 | Card line naming chosen Approach + section | `quranrevival.html:6382-6385` | name, section | `sectionsFromTenantDoc().find(n === tr.group)`, falls back to `tr.groupName` | **YES** |
| 8 | Ayah Card strip / summary; Unit Card statuses | `quranrevival.html:14930-14943`, `:15579-15590` | one chip per Approach with stage | `quranTrackables.map`, `langText(tr.name)` | **YES** (names, add, remove). Removed ones drop out; claims kept in data |
| 9 | Explore Approach palette | `quranrevival.html:8983-9012` (`renderExploreApproachList`) | grouped list | same as #5 (stored `group` + first item's `groupName`) | **PARTLY**, same reason as #5 |
| 10 | Explore — Approach wheels, all levels/tabs (Juz, Surah, Ruku', Hizb, Page, Āyah) | `quranrevival.html:7590-7600` `approachStatusesForCurrentUnit`, `:8778`, `:8819`, `:9199` | slices per current Approach | `quranTrackables` / `currentTrackableId` | **YES** for names, add, remove, counts-each-āyah (via `countsForEachAyah(trackable)`). No numbers |
| 11 | Explore / All-units wheel — slice numbers | `quranrevival.html:7631` (same builder) | `order` | as #1 | **PARTLY** |
| 12 | My Status — wheel numbers | `quranrevival.html:9320` | `num(trackable.order)` | `order` | **PARTLY** — stored `order` shown |
| 13 | My Status — list rows, per-Approach detail, 30-Juz strip | `quranrevival.html:9323-9345`, `:9410+`, `:9243` | name, headline, bar | `quranTrackables` | **YES**. Flat `order` order, **not grouped by section** |
| 14 | Note view Track / Guide / Breakdown tabs | `quranrevival.html:17681`, `:18980`; `js/way-modal.js:25-31` | Guide What/How/Measure | `trackable.guide` from tenant doc | **YES** — Guide edits reach it |
| 15 | Mushaf "Choose an Approach" capsule / ring | `quranrevival.html:14565-14580` | name · stage | `quranTrackables.find(mushafRingApproachId)` | **YES**. If the chosen one is later removed it falls back to "Choose an Approach" |
| 16 | End-of-unit prompt | `quranrevival.html:15130-15140` | Approach name | `quranTrackables` | **YES** |
| 17 | "Counts for each āyah inside" pooling | `js/approach-coverage.js:44-48` | affects every rollup/pooled colour | `trackable.countsForEachAyah`; else **`DEFAULT_YES_TRACKABLE_IDS` = approach_01/02/03/04/05/07/08/11** (fixed copy, `:30-33`) | **YES** once set in Catalogue; an untouched Approach uses the fixed default list. New Approaches default **No** (`catalogue.js:576`) |
| 18 | Monitor — Quran Approaches table | `monitor.html:476-500`, `js/monitor.js:140-160` | name + section, per-status counts | `trackableList` filtered non-archived, sorted by `order`; names and `groupName` from tenant docs | **YES**; no number displayed |
| 19 | Monitor — activity table / CSV names | `monitor.html:417`, `js/monitor.js:178` | Approach name per entry | `trackableList.find(id)` — **includes archived** | **YES**, and correctly still names removed ones (history) |
| 20 | Records — Approach select (claim form) | `records.html:418-419` | name | tenant trackables, non-archived | **YES**. Records tables (`:515-561`) name by id incl. archived: correct |
| 21 | Backup file (HTML) — Approaches section | `js/backup-file.js:363-365`; source `js/backup.js:182` | name, id, subject, "Section", status | tenant trackables, sorted by `order`, **includes archived** with status | **PARTLY** — the **Section column reads `tr.section`** (`:365`), a field no tenant doc carries (the seed writes `group`/`groupName`, `catalogue.js:196-197`), so it prints "—" for every row |
| 22 | Backup JSON | `js/backup.js:182,303` | raw trackables | tenant docs | **YES** (verbatim) |
| 23 | Admin self-check | `js/self-check.js:224-231` | "N Quran Approaches across M sections" | tenant trackables, non-archived, `new Set(group)` | **YES**; no 30/7 assumption (fixed v08.112). "M sections" counts distinct `group` used, not the tenant's section list |
| 24 | Bookmarks | `bookmarks.html:943` | — | stores no Approach | n/a |
| 25 | Study-event auto credit (reading / listening / journal / WbW) | `js/study-event-wiring.js:62,104,217`; `js/study-approach-contract.js:8-32`; `js/study-activity-evidence-id.js:52-56`; `js/note-journal-evidence.js:39` | which Approach a study action credits | **hard-coded ids** `approach_01/03/04/07/08/10` | **NO by design** — bound to permanent ids, not names. A rename or move is harmless; **a rename that changes an Approach's meaning, or removing one of these six, silently mis-credits or writes to a hidden Approach** (no warning in Catalogue) |
| 26 | Hifz / WbW special handling | `quranrevival.html:6240` (`approach_02`), `:9269-9276`, `:9350`, `js/approach-coverage.js:18` (`approach_04`) | Hifz shortcut, WbW counted in words | hard-coded ids | Same as #25 |
| 27 | Legacy import | `migrate.html:133-137` | way id → `approach_NN` | fixed convention | n/a to display (one-time tool) |
| 28 | Other modules (Deen, Arabic, Hadith, General, Health, Life-skill, LDOG, Nature-Life) | `*-study.html` `initTopicStudyPage({trackableId:"studied_*"})` | one trackable per module | tenant doc by fixed id | n/a — Quran Approach edits do not apply; not Approach lists |
| 29 | Tagline default | `js/taglines.js:102` | "Quran Approaches — one Ayah, forty ways" | fixed seed text (tenant's own saved taglines override) | **PARTLY** — literal "forty"; does not follow `approachListTitle` or the count. Owner asked for this wording, so it is deliberate; it will go stale if the number changes |
| 30 | Feature registry / About | `js/feature-registry.js:51` | "the 30 Approaches in 7 sections" | fixed text | **NO** — stale label (admin/About only) |
| 31 | Catalogue page itself | `catalogue.html:987-1053`, `:1152` (`num(row.order)`), `:1263-1297` | list, position select, section groups | tenant trackables + tenant section list | YES (source of truth). Row number `row.order` (the Architect is changing this) |

## Flags asked for

**Still reading stored `order` as a displayed number** — `quranrevival.html:7631, 7707, 7911, 7928, 9320`; `catalogue.html:1152`. (Wheel + list, All-units ring numbers and header, My Status wheel, Catalogue row.) `order` is also used correctly as a **sort key** in `getTrackables`, `monitor.js:143`, `backup-file.js:148/364`.

**Still assuming exactly 30 Approaches / 7 sections** — none in behaviour. Fixed strings only: `taglines.js:102` ("forty"), `feature-registry.js:51` ("30 … 7"), `bn.js:1490` `"The 30 Approaches"` and `:1901` (translation keys for old wording). Comments in `quranrevival.html` (`:488`, `:3775`, `:17767`) and `catalogue.html:1011` still say "30".

**Names/sections taken from templates instead of the tenant's docs** — none on any display path. One indirect route: `syncUnneditedTrackableNames()` (`quranrevival.html:7439`, `catalogue.js:324-350`) overwrites the **name** of any un-edited Approach with the template's on each landing load; edits set `edited:true`, so Catalogue renames stick. It also overwrites `groupName` for un-edited docs unless `tenantOwnsSections()` — see NO-3.

**Removed Approaches still shown where they should not be** — none found on any Approach picker/wheel/list (`status !== "archived"` at `quranrevival.html:7382`, `records.html:418`, `monitor.js:142`, `self-check.js:224`). Archived ones **do** still appear, correctly, in history views (Monitor activity, Records tables, Backup file with status) and in the Catalogue's own list for restoring.

## NO / PARTLY, ranked by how visible they are to a reader

1. **Numbers on the wheel, landing list, All-units rings and My Status wheel are the stored `order`** (`quranrevival.html:7631, 7707, 7911, 7928, 9320`). Most visible: every reader sees them. After a move, remove or add they can show gaps or repeats until the Catalogue renumbers. *Being fixed in parallel.*
2. **Two orders on screen.** The landing list is grouped by the tenant's section list; My Status, the All-units rings and the wheel run in flat `order`. They agree only while Catalogue keeps each section a contiguous block of `order` (it does on every Catalogue write, but a section reorder via `saveApproachSections` renumbers `group` only, not `order`, `catalogue.js:722-747`) — so after a section reorder, or a legacy tenant, the wheel/My Status sequence can differ from the list sequence.
3. **Study-options / Note-view picker and Explore palette group by stored `group` number and print the first item's `groupName`**, not the tenant's section list (`quranrevival.html:6340-6356`, `:8990-9010`). Matches today because Catalogue rewrites `group`+`groupName` together, but it is a second copy of the truth. Related hazard: **removing a section from the tenant's list** leaves its Approaches on the old `group` number (`saveApproachSections`, `catalogue.js:735` "not touched or was removed"), and renumbering the remaining sections can hand that number to a different section, so those Approaches then appear under the wrong heading here. Also, an Approach whose section was renamed while `approachSections` was never saved would be reverted by `syncUnneditedTrackableNames` (only guarded by `tenantOwnsSections`).
4. **Backup file "Section" column is blank for every Approach** (`backup-file.js:365`, reads `tr.section`; docs carry `group`/`groupName`). Visible only to whoever opens the backup.
5. **Six Approaches are wired by permanent id** (`approach_01/03/04/07/08/10` for automatic study credit; `approach_02` Hifz; `approach_04` WbW in words) and eight by the default Yes list (`approach_01/02/03/04/05/07/08/11`). Renaming is safe; repurposing or removing one is not, and Catalogue does not warn. Not visible until credit lands wrongly.
6. **Fixed wording**: tagline seed says "forty ways" (`taglines.js:102`); feature registry says "30 … 7" (`feature-registry.js:51`); stale comments naming 30. Low visibility, will age when the count changes.
7. **Admin self-check "across M sections"** counts distinct used `group` numbers, not the tenant's sections (`self-check.js:225`) — an empty section is not counted. Admin only.

## What was not checked

No browser or emulator run; nothing was executed, so any "YES" is a read of the code path, not an observed result. `_prev-quranrevival.html` shim files were ignored. The Architect's in-flight edits to `catalogue.html` / `quranrevival.html` were not seen.
