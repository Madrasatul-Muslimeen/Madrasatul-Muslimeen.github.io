# Owner decisions — 27 Sep 2026

Recorded by the MMSA Architect, in the Owner's own words where given. Binding
until the Owner changes them; a later session must not ask these again.

Context: the Owner asked *"How do i attempt an approach and claim it while i am
on Mushaf view? Show me your thought, a demo."* The Architect published a
clickable mock-up (https://claude.ai/artifact/27UcbuvPMQKRU3ci1RA6KC) showing
today's route (tap the āyah-end marker → Ayah Card → "Take an Approach", which
saves Learning only) and a proposal. The Owner answered on the demo:

| # | Question | Owner's answer | What it means |
|---|---|---|---|
| 1 | A one-time hint strip under the top bar ("Tap ۝ for one āyah · tap the title for this page"). | **"Don't make another bar."** | No hint strip or any new bar in Mushaf view. |
| 2 | How an āyah is chosen in Mushaf view. | **"Put the Ayah sign only for selecting an Ayah."** | The āyah-end marker (۝ with its number) is the one way to select an āyah. |
| 3 | The page card's default: every āyah on the page, or the page as one unit? | **"Page should come as 'this page as one unit'."** | Tapping the top-bar Surah/āyāt reference (v08.89) opens a **This page** card whose Approach claim is on the existing `page` Study Unit (one record, `subject_quran` chunk). |
| 4 | Should a page claim also fill each āyah? | **"Keep Ayah has It's separate approach because we want to encourage for Ayah study."** | A page claim never writes āyah claims. Āyah claims are made only from the āyah's own card, and stay separate from page claims. The "every āyah on this page" option is **not** built. |
| 5 | Four statuses, or just Learning · Achieved? | **"Keep all 4 stage."** | Both cards show Not started · Learning · Practising · Achieved for the chosen Approach. Achieved goes through confirmation where the Madrasah requires it, as today. |

## Later the same day — "Know Your Status", whole-unit claims, Tajweed

The Owner asked for a card telling a person their status on the whole Qur'an,
by Approach, and whether Tajweed colours can show in Mushaf view. The
Architect published a demo (https://claude.ai/artifact/Ky6C7bWj13eXusAEc2ibxG).
The Owner answered:

| # | Question | Owner's answer | What it means |
|---|---|---|---|
| 6 | Does a claim on a Surah (or Juz, page, range) count for every āyah inside it? | **"It can't be justified for all approaches. For example, Critical reasoning of a Surah can't be applied to all Ayat though for Hifz, yes."** then **"Enable Yes/No settings moveable between, possible?"** | Each Approach carries a Yes/No setting: **"A claim on a bigger unit counts for each āyah inside it."** Yes: a Surah/Juz/page claim counts for its āyāt (today's Explore behaviour). No: it counts only as a claim on that whole unit, never for its āyāt. The Owner (and Prime) can move any Approach between Yes and No at any time. Starting values set by the Architect: **Yes** for 01 Reading (Tajweed), 02 Hifz, 03 Reading (Meaning), 04 Word-by-Word, 05 Arabic Writing, 07/08 Listening, 11 Ruqyah Listening; **No** for all others. |
| 7 | Must Explore and the status card agree? | **"Explore n status both should be in agreement."** | Both read the same setting and the same counting rule. |
| 8 | What does the headline count? | **"count Achieved + Mastered."** | The status headline for an Approach is āyāt at Achieved or Mastered, out of 6,236 (Word-by-Word in words, out of 77,429). |
| 9 | Tajweed colours in Mushaf view? | **"keep both. Each page has toggle to move views from regular to T color."** | Plain Mushaf stays the default; a per-page toggle switches to Tajweed colours. Built only after the font licence is confirmed. |

## Later the same day — the app-store plan and the family of apps

The Owner asked for a plan to publish QuranRevival as a standalone store app
(https://claude.ai/artifact/EELE2T8Y9p8US8yUM5gPD5), then asked whether the
other modules would show in it, and then for a plan for a family of apps
(https://claude.ai/artifact/4UuzykL459QwizXUUseJUp). The Owner answered:

| # | Question | Owner's answer | What it means |
|---|---|---|---|
| 10 | In a standalone QuranRevival store app, do the other modules show? (store plan, decision 3) | **"Agreed, record it as decision 3 in the plan."** | The store app is **Quran-only**. Other modules do not appear at all, not even locked or greyed out; they stay on the MMSA website. Notes the person made in another module show read-only with a link to where they open. A guardian may record a child's Qur'an progress in the app; Classes, Homework, Monitor and People stay on the website. One "More from Madrasatul Muslimeen" link on About. |
| 11 | How the apps are organised. | **"Make a plan for building three distinctive setup. Quran, Hadith, Dua (new), Health (and all other modules) as standalone for apps. But they all combined as MMSA (both in Website and app, finally when we will declare and use this as the Madrasah app. But for now … MMSA remains only as site. And later we will combine all Deen module (Quran, Hadith, Dua, etc) in a combined app."** | Three levels, all from one code and one Firebase project (D1): **(1)** one app per subject, QuranRevival first, then each other module (Hadith, a new Dua module, Health and the rest) only when it passes the readiness check; **(2)** later, a combined Deen app (Quran, Hadith, Dua and the other Deen modules); **(3)** MMSA with every module and the Madrasah tools, **website only for now**, an app only when the Owner declares it the Madrasah app. A module is built on the website first; an app is a recipe naming its modules. **Dua is a new module**, not yet built. Open questions (publisher, naming pattern, where Asma ul Husna goes, order after Quran, Dua text sources, the Deen app's contents) are listed in the plan and asked when each step comes near. |

| # | Question | Owner's answer | What it means |
|---|---|---|---|
| 12 | Where the app-store effort goes first. | **"While we keep doing as we have been, but emphasize on QR and Asma for app store."** | Website work carries on as before. For the app stores, **QuranRevival and Asma ul Husna come first**, ahead of Hadith, Dua, Health and the rest in the family plan. Open, asked the same day: whether Asma ul Husna goes **inside** the QuranRevival app (it is already woven into the Quran screens: Explore's Asma panel, the Ayah Card's "Asma ul Husna Name(s)", posters) or ships as its **own** app straight after it. Until answered, decision 10's "Asma stays on the website" is read as superseded for Asma only. |
| 13 | Who publishes the apps. | **"AAAsApps publishes all apps."** | Every store app (QuranRevival and the rest of the family) is published under **AAAsApps**. |
| 14 | App names. | **"Will choose individual names when it is time."** | No naming pattern is fixed now; each app's name is chosen when its store step comes. |
| 15 | Where Asma ul Husna goes (decision 12's open question). | **"AU fits inside the QR, of course but how can we make it standalone as well, legitimately?"** | Asma ul Husna is **inside the QuranRevival app**. A standalone Asma app is wanted as well, if it can be made legitimately; the Architect's answer (a distinct purpose and features of its own, sharing the account, not duplicating Quran reading) is to be confirmed before it is planned. |
| 16 | When store preparation starts. | **"Store prep starts After finalizing the QR, lot of fixes needed there."** | Store work waits until QuranRevival is finalised on the website. The Owner will send fixes (My Status, taking an Approach from every view, and others) first; those come before any store step. |

The Owner also asked for an operating prompt for ChatGPT as advisor-reviewer:
`docs/governance/advisor-chatgpt-operating-prompt.md`.

## 28 Sep 2026 — version numbering past v08.99

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 17 | v08.99 is the last two-digit number in the 08 line. Open v09.00, or continue? | **"no. continue v08.100 and so on until a substantial changes in the app."** | The 08 line continues as **v08.100, v08.101, …**; v09.00 is kept for a substantial change to the app. The version checks accept a two- or three-digit minor and compare versions by number, not as text (so v08.100 comes after v08.99). |

## 28 Sep 2026 — the Unit Card (acting on units bigger than an āyah)

The Architect's proposal and working demo: https://claude.ai/artifact/SC8HePL1JDxtSG6hSggNfd
(one Unit Card for Ruku', Page, Hizb, Juz, Surah and Range, opened from markers in the Read view and from a ladder on the Ayah Card; Take an Approach, Note, Bookmark, Play, Mark as read, Status, Inside). The Owner's answers:

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 18 | A unit button on the Read bar? (The Architect suggested not for now: the bar already wraps on phones.) | **"yes"** | Build the gold unit chip on the Read bar, naming the chosen Study Unit and opening its Unit Card. Its cost to the Read bar is measured at every phone width and reported; the reading area must not lose more than it has to. |
| 19 | The "End of Ruku' — how did it go?" prompt: on or off by default? | **"as you suggested"** | **On by default**, with a setting to turn it off. It appears once, after the last āyah of the chosen Study Unit, and never blocks reading. |
| 20 | "Mark as read" for Ruku', Page, Hizb and Juz? | **"as suggested"** | **Ruku' and Page: yes. Hizb and Juz: later.** Recording Activity for Ruku' and Page amends ADR-008 and needs a Rules change the Owner publishes; until then those buttons explain why they are off. |

## 28 Sep 2026 — every unit on the wheel

The Architect's demo: https://claude.ai/artifact/EjaDZkJAtuBCKtgACFYTob (version 2 carries these answers). Each Approach slice on the landing wheel becomes rings, one per unit holding the current āyah; Explore gets the same rings. The Owner's answers:

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 21 | All units by default, or a choice? | **"one with choice in toggle as in the demo."** | One wheel with the demo's toggle: **All units**, or any single ring on its own (today's behaviour). The choice is remembered per browser. |
| 22 | Ring order. | **"opposite, big to small, Juzz at the center, Then Surah, and so on."** | From the middle out: **Juz, Surah, Hizb, Ruku', Page, Āyah.** (The Architect placed Ruku' before Page; **confirmed by the Owner 29 Sep 2026: "yes, A and Night"**, after a side-by-side demo.) |
| 23 | Explore rings. | **"Two rings at the entire Quran (Juzz and Surah), three inside a juzz (Ruku, Hijb, Page) and Surah to Ayah (if there is another/ next level of ring possible)"** | Whole Qur'an: **Juz** (middle) and **Surah**. Inside a Juz: **Hizb, Ruku', Page**. Inside a Surah: **Ruku', Āyah**. Every ring is sized by text (each printed page counts the same), so the Juz stay even and the Surahs line up with them. A unit crossing the edge shows only its part. |
| 24 | The data boxes. | **"I liked these stat/ data boxes (image) so much. enable these."** | Beside each wheel: the ring key ("Rings, from the middle out") and a box for what was tapped. On the landing wheel it lists that Approach unit by unit, with a way to Explore; in Explore it gives the unit's status and āyāt counts, with a way to open it. |

The Owner also wrote: **"In fact I liked all color combination of the demo. Enable it for entire app."** That is recorded here and **not yet decided in detail**. Whether it replaces today's light pages or becomes a Light/Dark choice, and whether it is the "substantial change" that opens v09.00 (decision 17), is being put to the Owner.
## 28 Sep 2026 — night cards on light pages

The Architect's demo: https://claude.ai/artifact/Jx2ztJRnNA1Dc48BnAqr44 (the app's cards, pop-ups and info boxes in the wheel's night colours, on light pages).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 25 | Night cards on light pages: is this the look? | **"How about only in the wheel/ explorer and all cards/ info/ boxes in anywhere in the app?"**, then **"Ha ha, keep both as options to choose by the user!"** | Pages stay light. Cards, pop-ups, sheets, info boxes, the wheel and Explore get a **card look** the reader chooses: **Night** (the demo's colours) or **Light** (today's). It is remembered per browser, with the Language setting. **Night is the default** (the Architect's choice, as the look the Owner liked; the Owner may reverse it). The five status colours are the same in both. In Night, the Note pop-up's writing area stays light for long writing. **Night as the default for a new reader confirmed by the Owner 29 Sep 2026 ("yes, A and Night").** |

**Confirmed 28 Sep 2026:** the Owner answered the demo's two questions: *"1. yes, 2. as you suggested. writing area light."* Light pages with Night cards is the look they meant, and the Note pop-up keeps a light writing area in Night. Night as the default still stands as the Architect's choice.

## 29 Sep 2026 — the v09 line and the third archive

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 26 | When did the 40 Approaches start, and should that open v09? | **"I think we should make that v09.01 ? Means, we should have 08.11? as the 3rd legacy app and store it like the previous ones. … make sure don't mess up with things"**, then, asked which build to freeze, **"v08.103"** | **`legacy-v08/`** is `app/` exactly as released at **v08.103** (commit 54f93098, the last build before *Add an Approach*), stored like `legacy-v07/`, with one documented change: its service-worker registration is switched off so it can never touch the live app's. **The next release is v09.01**; v09.00 is deliberately not used. Released numbers v08.104–v08.117 stay as they are (the ledger and CHANGELOG point at them). The 40 Approaches are tenant DATA, so the archive also shows 40, with the v08.103 screens. |

## 30 Sep 2026 — buttons on the Read page for readers from the Read list

The Architect's demo: https://claude.ai/artifact/BSZNHsskcZzu5fhKjfi7wj (issue #419).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 27 | Where Note View · Track · Approach sit on the bare Mushaf page, for readers who opened it from the Read contents list. | **"Okay, placement is fine, go ahead"** | Below 600px: one slim row fixed to the bottom, three equal buttons. From 600px: on the top line between the page reference and ⤢. Shown only for readers who came from the Read list, only in the bare full-screen state. Each opens an existing screen (Note View = Study menu's Note; Track = the unit's card; Approach = the Approach tab). |

## 30 Sep 2026 — the phone heading line, and a wheel slice's destination

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 28 | Where Read sits on the phone heading line. | **"Place Read button in the middle of the gap. It may look elegant if you put dot or a \| like bar in between those buttons, whichever looks nicer."** | Below 520px: *Mastery Wheel*, then Read exactly midway to *Know Your Status*, with a thin \| drawn midway between Read and Know Your Status. The Architect chose the bar over the dot after looking at both (a dot read as a stray speck). Released v09.07. |
| 29 | What a tap on an Approach slice (or list row) opens. | **"Clicking on the approach slice at the landing wheel brings here, asking for another click. Why not straight to the view it is meant for?"** | The Note view opens with that Approach's Track card already unfolded, the tapped Approach chosen, and scrolled into view. Released v09.07. |

## 30 Sep 2026 — the writing sheet (issue #421)

The Architect's demo, five versions: https://claude.ai/artifact/NADouD4uotBxcnEHCipqRE

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 30 | A tracing view for the Arabic Writing Approach (a photo of a tracing Mushaf). | **"Unit should be all. Letters both combined. Space extra"**, then **"make outline more wider but thinner liner … Make it everywhere"**, then **"the size of the text cannot break the Mushaf structure/ placement of Ayat and words. Make every page printable in A4 size paper. … writing over the touch screen and user be able to save it in their phone (not in app)? … make the inside hollow with very thinner outline"**, then **"OK, go ahead with the writing sheet, but i think the text need to be more lighter."** | A ✍ Writing sheet button on the Read and Note views, for every reader and Approach and every unit. It opens the unit's real Mushaf pages (the printed 15 lines and words per line, never re-flowed; size scales the page), A4-shaped, hollow letters with a very thin light outline (#b4ab96), dark āyah numbers, ruled lines. Write with a finger or stylus; Save picture puts a PNG on the phone and nothing is stored in the app; Print A4 prints one Mushaf page per A4 sheet. Then **"Did i tell you to make an option for more lighter text one? If not, include it."**: a **Lighter** toggle (#d6cfbf) beside the default Light (#b4ab96), remembered per browser; the āyah numbers stay dark in both. Then, with the photo again: **"if it is not late, also keep exactly this as an option too"**: a third letter style, **Like the book** — pale solid letters (#dcd8cd), no outline, exactly like the photo. Three styles: Light · Lighter · Like the book. |

## 30 Sep 2026 — Know Your Status in every unit

The Owner, looking at Know Your Status on a phone: *"Can you confirm me about this, had this been skipped and when, how and why? My instructed for status was in terms of all units."* Finding: v08.99 (#341) built Juz/Surah/Ruku'/Hizb figures, but only inside each Approach's card, one tap deep; the main list stayed āyāt-only, and Page was never included. Demo: https://claude.ai/artifact/2bKWatTbWjjyH2Bx29NpKL

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 31 | Every unit in the main Know Your Status list? (units biggest first, Juz → Āyah; a unit counts when the whole unit is Achieved or Mastered, as Explore colours it; Page added everywhere, including the Approach card) | **"all yes, go ahead."** | Each Approach row shows six tiles: Juz /30 · Surah /114 · Hizb /60 · Ruku' /556 · Page /604 · Āyah /6236, Achieved + Mastered, the same pooling Explore uses (decision 7). Word-by-Word stays in words. Page joins the card's By unit rows. |

## 30 Sep 2026 — where the ✍ Writing sheet button lives

| # | Question | Owner's answer | Meaning |
|---|---|---|---|
| 32 | The ✍ button made the Read bar a line taller at 320px (Mushaf) and the Note bar a line taller at ~375–400px. Study menu, bars (accept taller), or both? | **"Both"** | **✍ Writing sheet** is a Study-menu item for every reader at every width, and the Read and Note bars show ✍ only where it costs the bar no extra line, measured in the app at runtime (what fits depends on names, language and admin-only buttons). |

## 30 Sep 2026 — how many of each unit, on the Read list's tabs

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 33 | (A screenshot of the Read list's tabs, Surah circled.) | **"Mention the numbers count in each unit (beside or below the unit name, whichever looks elegant)"** | Each tab of the Read list carries its count on a quiet second line under its name: Surah 114 · Juz 30 · Hizb 60 · Page 604 · Ruku' 556, in the reader's digits. The Architect chose **below**: five tabs share a phone row, and "Ruku' 556" beside its name would be cut at 320px. The counts are read off the same lists the rows come from, never typed. |

## 30 Sep 2026 — the full-screen button, the Writing sheet's Hide, the heading marks

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 34 | (A desktop screenshot of the Read bar, the faint ⤢ circled.) | **"Make this button (everywhere) prominent, noticeable, bigger."** | The full-screen ⤢ on Read, Note and Explore is a 36px square with a 2px gold border and a 1.3rem glyph (was ~30x27, 15px); solid gold while full screen is on, and no longer faded to 40% in the bare Read state, where it is the only way back. 36px rather than 40px: measured, 40px made each bar 4px taller again for no gain in reach. |
| 35 | (A phone photo of the Writing sheet, "▴ Hide" alone on a third line, an arrow to the empty end of the first.) | **"Move the hide button to the upper line. You should apply Common sense."** | Hide always sits at the right-hand end of the title's line, measured at runtime: last on the line when everything fits (PC), else after the last group that still fits beside the title, else straight after the title (a narrow phone). |
| 36 | The heading line's separators, A (a line on both sides of Read) or B (a dot on both sides), shown as real screenshots. | **"both dot/ line looks good to me. enable both appears randomly."** | Both gaps carry a mark; each page load picks the line or the dot at random. The three words share one baseline (the earlier "it has to be aligned"). |

## 30 Sep 2026 — three buttons wherever they apply

Demo (the Read view, Mushaf, one bar split in three): shown in the session as real screenshots.

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 37 | "We should always make these buttons available wherever it applies to: Take/ Choose an Approach \| Track/ Record Your Progress \| Know Your Status. What do you suggest?" The Architect suggested Choose and Track (the app's existing words). | **"I choose 'Take an Approach' (Because user should take approaches, all, not choose this or that) And 'Record Your Progress' (This requests/ motivate to validate his study, not tracking it). Yes, show in both views."** | One bar of three buttons, **Take an Approach \| Record Your Progress \| Know Your Status**, in the Read view (text and Mushaf) and the Note view. Take an Approach opens the Approaches wheel and list; Record Your Progress opens the card that records the unit on screen (the page's card in Mushaf view, the chosen unit's card in text view, the āyah's Track card in the Note view); Know Your Status opens Know Your Status. The Owner's words are the labels, in place of the Architect's suggestion. |

## 30 Sep 2026 — a visible Search on the landing page

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 38 | "There should be a visible SEARCH button on the landing page. But where? With the wheel. Read, Status bar? Show me your a few suggestion." Four places were mocked in the real page: A top right of the banner, B on the wheel's heading line, C a search box under the heading, D inside the wheel. The Architect recommended A. | **"A, go ahead"** | A gold-bordered **🔍 Search** button at the right of the banner's title line (the magnifier alone below 360px, so it never costs a line). It opens Study options with the cursor in the existing search box, which takes "2:255" (goes there) or a word (searches the whole Qur'an). |

## 30 Sep 2026 — a title for the stage buttons

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 39 | (A photo of the Page card from the Mushaf/Read view, the gap between the Approach pull-down and the four stage buttons marked.) | **"As approach has the title. Give the title to record as well above the progress Tabs: (Icon) 'Record Your Progress'. Make it look elegant. Keep proper space. Then show"** | Every card that carries the four stage buttons (Ayah, Unit, Page) titles them **✅ Record Your Progress**, in the 🎯 Take an Approach title's own face, with clear space above it (23px from the pull-down) and close to its own buttons (6px). |

## 30 Sep 2026 — Mapping My Journey: account info, Back, and the folder tray

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 40 | (A phone photo of Mapping My Journey, the Back row and the Tenant/Person row circled.) | **"1. Tenant info should not be here. It should be under Home, under a new button with user account card info (build full thing later). 2. Can't allow back button takes a bar space. This is not a quality work from the builder, nor a quality job from you as an Architect."** | A **👤 My account** item under Home opens an account card holding the page's Tenant (and, where it has one, Person) picker — the same elements, moved. Back is never a line of its own: an "←" icon on a row that already exists. Round 1 (#432): Mapping My Journey and Import Notes; round 2: the other 23 pages carrying a Tenant picker. **Not moved:** the Quran page's Student picker in Study options, which is D10's fast "log for each child in turn" control; only its tenant ("User Role") picker moves. |
| 41 | (Same message.) | **"3. Mapping is about the folders. Therefore, it should pop up the folder tray, draggable, resizable from all sides n corners with all the functions of the folders I originally instructed to have … I gave a detail prompt from 'Siyagah' notebook app's architect … Do you need it again? Also all notes once click should open in a note view with all its function enabled (i can give that also from Siyagah, if you need it)"** | **Waiting on the Owner's Siyagah references** (the folder dialog and the note view). Only issue #259's summary of the first survives in the repository; the original text is to be stored under `docs/reference/` when it arrives. v08.63 (#259) recorded two deviations from it — one ⋯ menu at every width instead of separate icons on a PC, and no touch drag — and it is a page, not a tray. |

## 30 Sep 2026 — the Siyagah folder system and note pane (the Owner's handover v2)

The Owner supplied the Siyagah Architect's handover, stored verbatim at `docs/reference/2026-09-30-siyagah-folder-and-note-pane-handover-v2.md` (its settled decisions M1–M6 are the Owner's). Asked: *"Enable this Folder and note features prompt from Siyagah, but confirms with me."* The Architect checked it against MMSA's code and deployed Rules and put seven points where the two differ.

| # | Question | Owner's answer | Meaning |
|---|---|---|---|
| 42.1 | "Delete" can never erase in MMSA (I4, D6): Trash = retire, Restore = un-retire, no Empty Trash. | **"If trash items don't take data storage, i have no prob."** | Told honestly: they take a little (an empty folder a few hundred bytes; a note its text and revisions, a few KB each; 1,000 trashed notes ≈ a few MB of the plan's 1 GB). Built as Trash/Restore; a true erase, if ever wanted, is a separate admin-side tool (D6). |
| 42.2 | Folder numbers derived from position (MMSA, v08.63) rather than written into names (Siyagah). | **"yes"** | Numbers stay derived and display-only; a move renumbers instantly with no renames. |
| 42.3 | Autosave: typing kept on the device every second; a revision written after ~30 s idle and on every exit path (leave, close, background). | **"ok"** | As stated. |
| 42.4 | "Pop-ups wherever a note is opened" means the permanent Notes (Mapping My Journey, Notes page), not the Quran āyah Note view. | **"right"** | As stated. |
| 42.5 | Tags and Note Types (not in M1–M6; need a Rules change). | **"we need Tag only not 'type' here."** | **Tags are built; Note Types are not.** Tags join folder colour/bold and sections in the one Rules package the Owner publishes. |
| 42.6 | Siyagah's Primary quick-capture inbox. | **"yes"** (leave it out) | Not built. |
| 42.7 | The Mapping My Journey button opens the folder tray as a pop-up over the current screen (draggable, resizable from every side and corner; a full-screen sheet on a phone), with Timeline and Path as tabs inside it. | **"ok"** | As stated. |

## 1 Oct 2026 — Asma ul Husna in Explore

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 43 | (A screenshot of Explore → Asma ul Husna with one Name chosen: the Names pull-down last on the bar, and the wheel's space empty, saying "References don't need a wheel".) | **"Name column should move after 'Group'. Then, the Name poster should appear in the space marked on selection of individual name. (I am giving you a separate task for AH Names POSTER making)"** | The bar reads **Group · Names · Dual · …(every other classification) · ⋯**. With one Name chosen, its **poster** fills the wheel's space; a tap opens it full size. The poster is today's generated poster (`renderAsmaPosterHtml`); the Owner's separate poster-making task will change how it looks, not where it appears. |

## 1 Oct 2026 — Study options: Save at the top, Search below it

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 44 | (A phone photo of Study options with two arrows: one from *☆ Save these settings* up to the title line, one from the Search box up to just below it.) | **"Options Card: Move save button to top And move search bar below it (see image mark up)"** | *☆ Save these settings* sits on the Study options title line, between the title and ×; the title line is sticky, so Save stays in reach while scrolling. **Search** (the box and its button, its message and its results card) is the first thing in the body, above User Role. Saved-setting chips and the naming form stay where they were, under Search. Below 390px the Save label wraps to two short lines rather than being cut or reworded (measured: it needs 169px; 131px is left at 320px). |

## 1 Oct 2026 — Writing sheet on a phone: two rows, and move sideways when zoomed

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 45 | (A phone photo of the zoomed Writing sheet: the buttons on three rows under the title.) | **"Button needs to organise, make it 2 rows. Enable the page move right-left on zoom-in to go to a any part of the sheet. (It's now static on zoom in)"** | On a phone: the title line (Writing sheet · ✕ Close · ▴ Hide), then **✏ Write · Pen · Eraser · Undo · Clear**, then **letter style · Save picture · Print A4**. Measured: the three letter-style buttons plus Save and Print need ~430px, wider than any phone, so **Light · Lighter · Like the book became one pick-list** with the same three words; on a PC everything still sits on one line. The sheet now lets a finger pan **left-right as well as up-down** when zoomed (`touch-action` had allowed only up-down). While ✏ Write is on, a finger writes instead of moving the page, as before. |

## 1 Oct 2026 — Mastery Wheel: titles on one row, action buttons on another

Demo: https://claude.ai/artifact/MtMQwq6mdR5xmP8fVtfyib (three placements, real screenshots at phone and PC width, English and Bangla).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 46 | (A phone screenshot of the landing page.) "Mastery Wheel n Approach the Quran in 40 Ways are not buttons. Therefore they should be in the same row while Read, Choose a unit and Know Your Status are buttons for actions, therefore, should be in the same row. I won't mind which groups go where. Show me a demo placing the groups in alternative places." Shown: A (titles on top, buttons above the wheel), B (buttons on top, titles above the wheel), C (titles on top, buttons under the wheel). | **"Go with C."** | The heading line reads **Mastery Wheel · <the Approach list's title>** as plain title text, one line, its size stepped down to fit (never below 13px; two lines only if it still cannot fit). On a PC the same two titles are the wheel window's title bar. **Read · Choose a Unit ▾ · Know Your Status** are one row of gold buttons **under the wheel, above its colour key**, at every width. The heading's own Read and Know Your Status links are gone, and the row is no longer moved into a band across the card on tablet/PC. Decision 36's random line-or-dot stays, in the one gap between the two titles. The Choose a Unit list opens upward. |

## 1 Oct 2026 — Record Your Progress on the Ayah Card

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 47 | (A phone photo of the Ayah Card, the place under the Take an Approach pull-down marked.) | **"'Record Your Progress' (earlier know as Track) is missing in Ayah Card, should be here."** | ✅ Record Your Progress and its four stage buttons always show under Take an Approach. Until an Approach is chosen the stages are greyed and not pressable, and a line says "Choose an Approach above first, then tap your stage." Nothing is written until an Approach is chosen and a stage pressed. The Page card shares the same block. |

## 1 Oct 2026 — Asmaul Husna poster: references, wording, and the design

Demo: https://claude.ai/artifact/ToBqsf4h2f7ssYVgs5qzte (the template built from the Owner's image and build spec).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 48 | Al-Witr's Hadith: the project's reference list says Bukhari 6410; the Owner's image says 7392. | **"Bukhari 6410 is fine, we will confirm ref later (it is editable anyway)"** | The poster shows the reference list's value (6410). References are confirmed later by the Owner and stay editable. |
| 49 | Some descriptions and meanings say "Lord" or "God"; the build spec (§10.9) says Allah, not God; Rabb, not Lord. | **"change Lord/God to Rabb/Allah always."** | In the poster's wording, always **Rabb** for "Lord" and **Allah** for "God". To apply when the poster work resumes, listing every changed sentence for the Owner (a lower-case "god" meaning "a deity" needs reading in context, not a blind replace). |
| 50 | (The template demo.) | **"I am not happy with AH poster template design yet. Keep this task pending. I wanted exactly like the image plus modif i gave you. But your design is different. So, have to fix that first. I have new fix coming next"** | The poster task is **on hold**. When it resumes, the design must follow the Owner's image **exactly**, plus their modifications: the banner الأَسْمَاءُ الْحُسْنَى and the Classification box (decision 47's sibling ask). The current template (`app/js/asma-poster-template.js`, untracked) is not approved and is not wired into the app. |
| 51 | (The landing drawers demo, https://claude.ai/artifact/1dXrKwibEP1TUGARu892Fn, 1 Oct 2026, from the Owner's phone screenshot.) | **"Go, above, moving down the wheel, only that much that numbes are not cut"** | Under the wheel: the Read bar (Read · Choose a Unit · Know Your Status), then the open drawer's choices, then three drawer buttons **Wheel** (Dark, Light, Colour, Names) · **Legend** (the status colour key) · **Unit** (the wheel's Show buttons: All units, Juz, Surah, Hizb, Ruku', Page, Āyah), above the Approach bar. A drawer's choices open **above** the drawer buttons; one drawer open at a time. The wheel moves down **only as far as needed** for its top numbers not to be cut by the heading, measured, nothing more. Supersedes the 1 Oct "Wheel drawer" demo (standby). |
| 52 | Known-word marking: should knowing a word mark (A) the same dictionary word (lemma) only, or (B) its whole root family? And where should the light mark show: the Mushaf page, Word by Word, or both? (1 Oct 2026) | **"A, on both Mushaf page and WbW"** | Built as #472 (PR #473, v09.33): a very light tint on every occurrence that counts as known (known itself, or its lemma known); a claim still awaiting a teacher's confirmation is not marked. Same lemma only, never the root family. |
| 53 | The landing page demo (2 Oct 2026, from the Owner's phone photo): bolder Approach title, more room around the wheel, Wheel/Unit at the extreme edges, first screen ending at the dock. | **"go"** | Released as v09.32. |
| 54 | Dictionary (1–2 Oct 2026): sources, Bangla, links, wording. | **1 Oct:** "use QAC and Wiktionary … (draft me a letter) … both … Yes"; "go with the stuff from Quran f and Bangla d, build app. i can write to them before publishing". **2 Oct:** "yes to all three, demo me", then "go, and change God/Lord to Allah/Rabb always". | English meanings from Wiktionary, sure and likely matches (likely ones tagged); the Quranic Arabic Corpus and Lane · Hans Wehr (ejtaal.net) as links, nothing copied; fixed meanings ٱللَّه → Allah, رَبّ → Rabb (Sustainer, Master), إِلَٰه → god (deity); "God" → Allah and "Lord" → Rabb in every meaning (lower-case false "gods" kept). Bangla dictionary meanings stay off until AQS gives permission and a digital copy, because the site is already public. Built as v09.34 (#476, PR #477). |
| 55 | Al-Fātiḥah numbering (2 Oct 2026): "make Al Hamdulillah Ayah as Ayah no. 1, Ayah no. 7 should be from 'Gairul…'". Shown the pros and cons: (A) a display-only count over the stored keys, or (B) changing the stored keys (a migration that would break the permanent unit keys, I5). | **"A, If user can switch the setting, that's good, do that. Keep that option."** then **"split is right, default on, go"** | Option A, display only: the Bismillah unnumbered, ٱلْحَمْدُ as āyah 1, and āyah 7 starting at غَيْرِ. Stored keys (1:1–1:7) never change. A per-reader setting, **on by default**. The translation of the stored 1:7 is split in two at "…bestowed favor," (English) and "…দান করেছ।" (Bangla), as shown. Issue #482. |
| 56 | (A Mushaf screenshot of Al-Fātiḥah, ar-Raḥīm circled, 2 Oct 2026) "When Ar-Rahman is achieved, that should mark 'Raheem as well, because of same root." Asked: the whole root (ر ح م has 339 words, including arḥām, wombs), a lighter second mark, or only linked words? | **"As long as words gets same meaning even though they are in different forms, they should count as known. Any words got different meaning, even though from same root, won't be counted. Make sense?"** | **Replaces decision 52's "same dictionary word only"**: a word counts as known when its own lemma, or another lemma of the same root **with the same meaning**, is known. The groups are `tools/dictionary-pull/meaning-groups-reviewed.json` (869 groups, 2,715 lemmas; machine-proposed, every root reviewed by hand, kept apart when unsure), built into `tools/quran-data-pull/output/lemma-meaning-groups.json`. Issue #484. |
| 57 | (A Word card screenshot, the two whole-Qur'an lines circled, 2 Oct 2026) | **"Make these eye-catching, bold, make the wordings, 'You know ... of .... words of the Quran'. "You know ...% words of the Quran'"** | The two lines sit in a gold-edged box, bold, with the numbers larger in the card's accent colour: **"You know 21,467 of 77,429 words of the Qur'an"** and **"You know 27.72% of the words of the Qur'an"** ("of the" added for grammar). bn: "আপনি কুরআনের ৭৭,৪২৯টি শব্দের মধ্যে ২১,৪৬৭টি জানেন" / "আপনি কুরআনের ২৭.৭২% শব্দ জানেন". A teacher or guardian viewing someone else's card reads "Knows …" instead of "You know …". Released as v09.38. |
| 58 | (2 Oct 2026, after v09.41) "We have 3 level of Language Learnig from WbW. Level 1, WbW is only the meaning of the word. Therefore, Achieved that will count only similar words/ form in the entire Quran. Level 2, Basic's progress will count for all words from the same root with same meaning. Level 3, Depth progress will count for those who study all the meanings/ words come from that root n dig the dict. when needed. Therefore, meaning all words originated from that root irrespective of its meaning. Got it? Do the count system accordingly" | Asked: one "You know" number or one per level? **"One per level"**. Asked: prepare the Rules for Basic and Depth word records, for the Owner to publish? **"Yes, prepare them"** | **Corrects decision 56.** The three Word card levels count differently: **WbW** Achieved → the same word (lemma) everywhere; **Basic** Achieved → every word of the same root with the same meaning (`lemma-meaning-groups.json`); **Depth** Achieved → every word of the root, whatever its meaning. **One "You know X of 77,429 words" line per level.** WbW went back to the same word only at once (v09.42). Basic and Depth need a lemma-wide record at their own level, which the deployed Rules refuse (`quranLemmaProgress` create requires `level == 'wbw'`): the Architect prepares and proves the Rules change; the Owner publishes it; the app switches Basic/Depth counting on behind a readiness gate. |

## 2–3 Oct 2026 — The Word card rebuild (all three tabs)

Demo: https://claude.ai/artifact/4kUuxWFko5NRBLqu6trzFZ (version 6), saved as `docs/reference/2026-10-03-word-card-demo.html`. Full brief: `docs/reference/2026-10-03-word-card-build-spec.md`.

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 59 | The Word card's three tabs, shown as one demo over 2–3 Oct 2026 (search, root box, word parts, Root / Dictionary word / Form row, Basic's derived-form cards, Depth's sections and the verb conjugation table, two PC boxes with a ring). | **2 Oct:** "Ma Shaa Allah! Excellant! Make sure your real build is what actually you demoed." · "don't leave this space … make the texts horizontal" · "We don't use the word lemma, but 'dictinary word'" · "Place them just below the approaches tab" · "Place the Derivatives in an ORDER always. I will give you an order later but you can suggest one now." **3 Oct:** "Keep root in both places. One gives focus on the root and one gives flow of understanding." · "Root goes on the right, then Dict word and then Form" · "keep this one open like the image 2" · (the verb conjugation poster) "Can we have this inside Arabic in Depth, but not open … rather like accordian/ toggle" · **"Go, build all three tabs together."** | Build exactly the demo, in the order and with the details of the build spec. "Dictionary word", never "lemma". The derived forms follow the demo's suggested order until the Owner gives theirs. Only Root & Word Family opens by itself; the other Depth sections, including Verb Conjugation (تَصْرِيفُ الْفِعْل), open with a tap. Every Depth line is labelled From the data / Grammar rule / Needs a source; nothing is generated or unattributed. The real build is screenshotted beside the demo before each release. |

## 3 Oct 2026 — Mark known or unknown words

Demo: https://claude.ai/artifact/N6iuWKx4Rg5uNNy1RAr5kD (the switch in Study options → Reading view, and the Mushaf page in each mode, English and Bangla).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 60 | (A phone screenshot of Yā Sīn on the Mushaf page with the light known-word marks.) | **"Enable a swith between known/ unknown word marking (whatever user chooses). Marked words should be always less. (When 50% is known user can choose what hua wants to mark, known words or unknown words."** | A **Mark words** switch in Study options → Reading view, its own row under the reading ticks: **Fewer (auto)** · **Known** · **Unknown**. Known words keep the light green tint; words still to learn get a light amber tint, so the two can always be told apart. **Fewer (auto)** is the default (the Architect's recommendation, shown in the demo; the Owner may change it): it marks the known words while less than half of the Qur'an is known and the words still to learn once half or more is, using the best of the WbW, Basic and Depth "You know" totals. Remembered on the device, like the other reading choices; it writes nothing to the database and reads nothing at startup. Āyah-end markers are never marked. |

## 3 Oct 2026 — Answers to the waiting list

The Architect's report listed, in order: (1) review the part names and Form sentences, (2) the order of Basic's word-family cards, (3) sources for the Depth lines marked "Needs a source", (4) the two dictionary permission letters, (5) the Asmaul Husna poster (on hold).

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 61 | The four open items above. | **"Al Hamdulillah, keep going. 1. Keep going. Ma Shaa Allah! 2. Your order is okay. 3. No issue with permission, you can build. 4. Later. Keep reminding."** | (1) The part names and per-Form sentences (https://claude.ai/artifact/N4Caa9YnBPqqWGFr3R89oS) are accepted as they are. (2) Basic's derived-form order is the one built (`DERIVED_GROUP_ORDER`, the demo's). (3) Build the "Needs a source" lines from recognised sources (sentence iʿrāb, near-synonym distinctions, classical usage), each credited; the Architect checks each source's licence and says what it is before release. (4) The permission letters wait; the Architect keeps reminding. The Bangla dictionary meanings still have no digital source in the repository, so they wait with the letters. (5) The poster stays on hold (decision 50). |
| 62 | The Bangla dictionary meanings were waiting on a permission letter (decision 61, item 4), with no digital source in the repository. | **"Dictionary permission is not a prob. Can you Build it without permission for now? Usually all Quranic contents are always free for use in non-commercial purposes."** Then: **"I have this: https://ia800904.us.archive.org/17/items/mujammufahras/qab.pdf Will it work for our purpose?"** | Build the Bangla meanings now, for non-commercial study, without waiting for the letter. The source is the PDF the Owner supplied: the AQS *Quraniyo Obhidhan* (কুরআনীয় অভিধান), Muhammad Abu Hena, ed. Muhammad Yahya, Al Quran Academy London Bangladesh, 2nd ed. December 2015. Every use names the book. The permission letter to the publisher stays on the reminder list (decision 61, item 4), now as a courtesy and a safeguard rather than a blocker. |

## 4 Oct 2026 — The wheel's centre

The Architect's demo went through eight versions with the Owner on 3–4 Oct (https://claude.ai/artifact/WxBk4PJ2vRNawVmyBgmaN7). The Owner's directions along the way: *"keep the centre as before. It would only display what is chosen on the capsule. User can make the choice using the 'Choose a Unit' button. Instead we will place a open Quran emiting light from it at the bottom of the centre"*; *"the unit doesn't need to show that much bigger"*; *"You made the centre too big … Bismillah look so smaller"* (the wheel keeps its real proportions); and, with their own image of the Audhubillah and Bismillah in gold, *"Build this at this instead of the text you have now. Just copy paste and proportionate."*

| # | Question | Owner's words | Meaning |
|---|---|---|---|
| 63 | Demo version 8 of the wheel's centre. | **"Ma Shaa Allah, looks good. build it"** | Build `docs/reference/2026-10-04-wheel-centre-demo.html` into the real wheel. (1) The centre is a **display only**: the Owner's gold calligraphy (`app/img/wheel-hub-calligraphy.webp`, cut from their image: the Audhubillah on its arc and the Bismillah under it), placed in the same proportion to the hub's gold ring as in their circle (text box x 6.94%–94.86%, y 7.03%–46.13% of the ring's diameter); under it the chosen unit, small, in two lines (e.g. "Page 257" / "from Surah 14 · Ibrahim"; corrected 4 Oct from "Surah 15 · Al-Hijr", which was the demo's wrong starting pair); and the open Qur'an giving light at the bottom. The Surah and Āyah pickers leave the centre. (2) **Choose a Unit** gets the full unit choice, the same as Study options and in the demo's order: Study Unit; then the unit's number (Page / Juz / Hizb / Ruku' №) for a numbered unit; then Surah; then Āyah (single āyah) or From–To (range). (3) The wheel's own size and ring proportions do not change. The calligraphy image (50 KB) loads with the landing page; it is a picture, so it is the same in English and Bangla. |
| 64 | What comes after choosing a unit on the landing page. | **"in the 'Choose a Unit' on the landing page should have the buttons to read and play. Why? Because when user chose a unit now, what's the next action? It straight away should give hua to read or play the choice."** After demo v10: **"go, build it."** | Choose a Unit ends with two buttons. **Read** opens the reading screen at the chosen unit. **Play** opens it and starts the recitation in the same tap, exactly as Study options' Play does: the ticked reciters, Repeat, Mode and Loop. Builder round #547. |
| 65 | The landing page's first screen (the "Study Quran" button covered the centre until tapped) and the Qur'an's light. | **"B, demo it. Can you build a few other version of Quran with the lighting exposure to choose from?"** Then, from five designs and three exposures in demo v11: **"1, Bright. Can you put a 2 more stars there?"** | (1) **First screen B:** the Owner's calligraphy shows from the start. A smaller **Study Quran** button sits where the unit's name goes, naming the unit (e.g. "Page 257 · Ibrahim"); the open Qur'an stays at the bottom. Tapping it gives the centre as in decision 63. (2) **The light:** design 1, **Rays**, at **Bright** exposure, with **four** twinkling stars around it (two added) and, after **"May be three more stars inside the ray"**, **three** small stars inside the fan of rays: seven in all. The approved demo is `docs/reference/2026-10-04-wheel-centre-demo.html` (v13). |
| 66 | The Siyagah folder audit (4 Oct 2026): of Siyagah's folder and note features, 23 built, 13 partly built, 23 missing, with a plan of seven rounds, S8–S14. | **"go, start S8."** | Build the plan in order, one round at a time, starting with **S8: Mapping My Journey in three panels**: the folder tree (folders only; Notes leave the tree, as in Siyagah), the folder's Note list (✚ New note, Compact/Preview, ⬆ and subfolder chips, ➕ New folder, a quick-title bar that creates a Note in the folder, "in N folders"), and the Note. Phone and tablet show one panel at a time; desktop (1200px and up) shows three columns. Builder issue #551. S9–S14 follow without a new ask unless one needs a Rules change (the Note flags, S14), a delete, or a new screen. |
| 67 | The Qur'an's light (decision 65 chose Rays at Bright). The Owner: **"can you make sure the light is emiting from the Quran, not a light from the sun?"** Demo v14 added design 6, "Light from the Qur'an". | **"6, build it"** | The light comes **from the open pages**, not from one point behind the book: beams rise from along both pages' top edges, the pages themselves glow, and the **seven stars** of decision 65 stay, at Bright. The approved demo is `docs/reference/2026-10-04-wheel-centre-demo.html` (v14, design 6 the default). Built in the review of #549 (PR #550). |
| 68 | Word progress for a word with **no dictionary word** (lemma). The Owner, on 36:8:9 فَهُم in Basic Arabic: **"Since this conjugation is not applicable in Basic, should have a n/a button there. All words of these types should have n/a button."** Measured: **3,307 of 77,429** words have no lemma in the packaged data (1,787 Preposition + Pronoun, 827 Pronoun, 213 Conjunction + Pronoun, 30 Quranic Initials, …). This reverses the recorded rule in `quran-word-progress.js` that "a word of the Qur'an always applies", so it was asked. | Asked: automatic, or a fifth N/A button pressed word by word? And Basic and Depth, or Basic only? **"Automatic"**, **"Basic and Depth"**. | At **Basic** and **Arabic in Depth**, a word with no lemma is **Not applicable automatically**: the card shows that in place of the progress buttons, nothing is stored, and the word is **left out of the Basic and Depth totals** (I7: excluded, never counted as zero), so their whole-Qur'an total is **74,122**. **WbW is unchanged**: every word has a meaning. |
| 69 | Three demos from 5 Oct 2026: the Word card's stem (`docs/reference/2026-10-05-word-card-stem-demo.html`, options A glow, B gold frame, C highlighter), the folder window and pinned panel (`…-folder-window-and-pinned-demo.html`), and the Ayah window (`…-ayah-window-demo.html`). | Stem: **"Dark/ light keep both option a choice. And mix highlight n glow together but on the top word only glow, not hightlight."** Folder: **"For Folder, build it."** Ayah window: **"You build something else than what i asked for (Ayah). But i liked it. So go it. I will ask again later what I really wanted."** | (1) **The stem** is marked all over the Word card while *Colour word parts* is on: the big word at the top gets a soft glow only; the meaning, the legend, the Stem box and the Dictionary word box get the glow and the highlighter together. Both card looks keep their choice. (2) **Folder window**: ⋯ → 🗔 Open in its own window, as in the demo; and the **pinned Notes side panel** (📌 Pinned in a Note window), which replaces round 14's pinned strip. (3) **The Ayah window**: the Read view can float as a window on a PC. Built **opt-in**, per device: 🗗 in the read bar turns it on; until then the Read view is unchanged, and it is never a window below 900px. This keeps every existing reading screen exactly as it was; if the Owner wants it to open as a window by default, that is one line. The Owner's "what I really wanted" for the Ayah is still to come. |
| 70 | Mapping My Journey's panels had fixed widths, and MMSA's Note pane lacked many of the functions of Siyagah's note pane. | **"Make all the panes resizeable and add all functions of the notepane of Soyagah in the notepane"**, then **"Give me a full list with numbers, so i can tell which one not to do."** and **"include everything so that NS doesn't require any prompt from me for non-stop continueing it's job and the builder's job."** | (1) **Resizable panels**, built (v09.82). (2) **The Siyagah note-pane port** follows `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`: Part A (items 1–13) is built (v09.82); **Part B (14–33) is built in order without asking**; any number the Owner strikes out is dropped and recorded here. **Part C (34–45) waits for the Owner's answer per item**, because each needs new stored data, a Firebase change or an outside service. (3) The next session continues without a prompt (`NEW-SESSION-PROMPT-2026-10-05.md`). |
