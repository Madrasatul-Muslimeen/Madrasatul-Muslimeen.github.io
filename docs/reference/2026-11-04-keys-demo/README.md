# J03 Keys to Understanding demo (4 Nov 2026)

The demo of the Owner's decision of 4 Nov 2026 (PCF MSA J03, comment `j03own1104`), published at
https://claude.ai/artifact/RDDqWeai42MvNaXJcMVx5f. **A demo, not app code:** nothing here is imported by `app/`.

- `template.html` is the page; `build_data.py` (run from the repository root) writes `data.json` from the packaged
  Qur'an data (Yā-Sīn, roots, lemmas, verb forms, both dictionaries) and the āyah–hadith index. The published page is
  `template.html` with `/*DATA*/` replaced by `data.json` (`data.json` is not committed; it is rebuilt).
- It shows: Difficult / Need practice on the Āyah card, the Hadith card (Bukhārī 3199, HadeethEnc 65070) and the
  Word cards; the Status wheel's three agreed views plus two hadith views; the Hadith Word Card (WbW, Root, Family,
  Taṣrīf, Depth) for words not in the Qur'an, and QR's Word card for words that are; "Read next" (Qur'an, Hadith,
  Dictionary, Scholars by Approach, Tafsīr) on every card; a teacher's view with EXAMPLE students.
- Findings for the build: the app's dictionaries hold Qur'an words only; matching hadith words to Qur'an words by
  written form gave 2 wrong matches in this one hadith (أن → إنّ, فتطلع → تَطَّلِعُ), so matches must be checked;
  the HWC's grammar notes are drafts to be checked; tafsīr texts are not in the app.
- Build owners after the Owner's ticks: the QR Lead (Āyah card, QR's Word card), the Hadith Lead (Hadith card, HWC);
  a teacher reading a student's marks is a Firebase Rules step (Owner Control Gate; J03 Round 2 holds a candidate).
