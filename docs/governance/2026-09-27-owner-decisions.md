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
