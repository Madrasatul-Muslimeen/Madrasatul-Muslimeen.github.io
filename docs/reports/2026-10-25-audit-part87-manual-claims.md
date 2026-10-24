# Audit part 87 — the User Manual's MSA sections checked claim by claim (PCF MSA J29, issue #1158)

Suite: `tools/i18n-verify/manual-claims-msa-browser.mjs` (390x844 and 1440x900, English; Bangla only for the Language entry).
Run: `node tools/i18n-verify/manual-claims-msa-browser.mjs [--section=start|bookmarks|teaching] [--mutate=<section>]`.
Scope this run: Getting started, Bookmarks, Teaching/family/madrasah management. "Notes and Mapping My Journey" is left for a later round.

## ▸ Getting started and moving around

Totals: 70 pass, 2 FAIL, 1 SKIP. Mutation `--mutate=start` (Esc no longer reaches the menus): 6 FAIL (the 2 real ones + 4 mutated), run once.

| Entry | Claim | Result | Measured |
|---|---|---|---|
| Signing in and creating an account | Home ▾ holds Sign in with Google; a signed-in reader does not see it | PASS | button text exact, inside `.nav-cat-home`, not displayed when signed in |
| Signing in … | Pressing it signs in; sign-up link offered with no account | SKIP | real Google sign-in needs the network |
| Adding family members at sign-up | A family account shows "Who is in your family?" only after Create; rows have Name, Year of birth, child tick; + Add another; year under 18 ticks child; Save and continue reports and writes; Skip for now points to People | PASS ×2 viewports | stub signed in with an empty tenant; Added 1 to your family, person written |
| The menu bar | Four menus Home, Modules, Operation, Bookmark; tap opens, tap again / outside / Esc closes; Bookmark is a full-screen sheet closed by ✕ Close or Esc | PASS | sheet = viewport size at both widths |
| The menu bar | Modules ▾ holds Quran Study, Deen Study, Arabic, Hadith, Learn Deen On-the-Go, Asma ul Husna; General Study, Nature-Life, Life Skill, Health hidden; Home ▾ links Legacy v06 … v11 | PASS | |
| My account | Home ▾ → 👤 My account opens a card; ✕ closes; Tenant picker inside | PASS | |
| **My account** | **The card shows name, email, madrasah and roles** | **FAIL — the app is wrong** | On People (and every page using `mountPageAccountCard`) the card lists only **Email** and **Tenant**; Name only on pages with `movePerson: true`; **Roles never**. `account-card.js:167` passes no `roles`. Smallest fix: `mountPageAccountCard({ getRoles })` and add `roles` (and the signed-in person's name) to `getSummary()` — shared script, so left for the Architect. |
| Language | Settings → Language → বাংলা reloads in Bangla (heading, menus, table heads); English returns | PASS | |
| Card look | Light then Night set `data-card-look` | PASS | |
| The way back | A menu link opens the page with a ← Back button that returns to the page left | PASS (wording corrected) | **Manual is imprecise:** a button from a menu link reads **"← Back"**, not "← Back to …" (only bookmark-opened pages read "Back to <page>"). Suggested sentence: *Press the ← Back button (it reads "← Back to <page>" when you arrive from a bookmark or a reference). In the Read view …* |
| Taglines strip | A long line slides sideways; holding a finger pauses it, letting go resumes | PASS | `getAnimations()` running → paused → running |
| Taglines strip | Owner: Home ▾ → Settings → Taglines; page has Add line, motion, Scroll long lines, Scroll speed, Save; editing enables Save; Save confirms | PASS ×2 viewports | |

Side finding for the Notes round: on a page that mounts the Journey tray (People, etc.), **Home ▾ → Mapping My Journey opens the pop-up window, not "the full page"** (journey-tray.js intercepts the link). The Manual's "Home ▾ → Mapping My Journey for the full page" holds only on pages without the tray.

## ▸ Bookmarks

Totals: 38 pass, 2 FAIL, 3 SKIP (390 + 1440). Mutation `--mutate=bookmarks` (Save button and ✕ Close removed): 6 FAIL (the 2 real + 4 mutated), run once.

| Entry | Claim | Result | Measured |
|---|---|---|---|
| Bookmarking a place | ☆/🔖 asks for Name, Folder (+ New folder…), Assign to; Save writes the bookmark under its Name in the chosen Folder | PASS | on Deen Study ▸ Ethics; write contains the name and folder `f2` |
| **Bookmarking a place** | **Tapping again opens "Already bookmarked": Remove my bookmark / Add a bookmark…** | **FAIL — app and Manual disagree** | Only the Quran page's 🔖 (`openBookmarkExistsChoice`, quranrevival.html:23814) does this. On the topic pages' ☆ (`topic-study.js toggleTopicBookmark`) a second tap **removes at once**. Smallest fix: call `openBookmarkExistsChoice()` in `toggleTopicBookmark` when `existing` (shared module, so left to the Architect). Or, if the quick toggle is wanted, Manual sentence: *On the Quran page 🔖 again opens "Already bookmarked"…; on other study pages ☆ again removes the bookmark.* |
| Bookmarks for family members | Ticking a person under Assign to ends with "Saved for …" and a link to their bookmarks | PASS | |
| The Bookmark menu | 📖 Last read / ▶ Last played at the top; folders have ⠿ ✎ 🗑; ✎ renames (write recorded); ⠿ + ArrowDown reorders; 🗑 offers Undo and Undo restores; ✕ Close shuts it | PASS | |
| The Bookmark menu | Show times / Hide times | PASS (check corrected) | **check was wrong:** times are ON by default, so the button first reads "Hide times". Manual sentence is fine. |
| The Bookmark menu | "← Back to …" returns to the page you left | PASS (wording) | from Manage bookmarks… the button reads "← Back" (same Manual wording note as in Getting started). |
| Manage bookmarks page | + New bookmark / + New folder; Open, Rename, Retire on each row; Retire then Show retired → Restore | PASS | the New bookmark form opens with Name and Create |
| (not reached) | 🔖 on the Read bar, unit choices, listening state; per-person folder matching; Group by; Saved settings | SKIP | Quran Study is frozen/QR Lead's; second person's document not mutated by the stub |
