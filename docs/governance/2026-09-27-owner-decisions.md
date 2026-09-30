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
