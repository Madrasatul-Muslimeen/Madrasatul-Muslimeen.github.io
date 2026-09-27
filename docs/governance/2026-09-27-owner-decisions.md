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
