# Rule for the Hadith Study module: how a translation names Allah, His Rabb-ship and the Prophet

**Given by the Owner on 8 Nov 2026 (about 1:45 am Sydney, in the MSA Hadith Lead session), in their own words:**

> "Always translate RABB as RABB, never as Lord. Allah as Allah, never as God, only Ilaha can be translated as God.
> Mentioning prophet as Rasulullah Sallallahu A'laihi Wa Sallam. Rule for HADITH STUDY MODULE."

It joins the Owner's earlier rule `saw128` (28 Oct 2026): in English, after "Rasulullah" always write "Sallallahu A'laihi Wa Sallam".

## The rule, in four lines

1. **Rabb** stays **Rabb**. Never "Lord". ("my Rabb", "Rabb of the worlds".)
2. **Allah** stays **Allah**. Never "God".
3. **Ilah / Ilaha** is the only word that may be translated "God" ("There is no god but Allah" renders La ilaha illa Allah).
4. When the text means our Prophet, write **Rasulullah Sallallahu A'laihi Wa Sallam**, not "the Prophet" or "the Messenger of Allah".

## What it binds

- **Everything the Hadith module writes itself**: buttons, notes, labels, demos, explanations, help text, in English and Bangla. Checked 8 Nov 2026: `app/js/hadith-*.js`, `app/js/dua-*.js` and `app/hadith-*.html` contain no "Lord" or "God" and no "the Prophet" label.
- **Demos** shown to the Owner (the first colour demo wrote "my Lord"; fixed in v1.02).

## What it does NOT yet reach, and is a decision, not a quiet edit

The translations the app displays are **sourced text** (HadeethEnc, and the English folds of the Arabic books). They are shown exactly as sourced (the `saw128` carve-out for quoted sources). Counted on 8 Nov 2026 in HadeethEnc's English (2,328 hadith): **"Lord" 776 times, "God" 22, "Prophet" 6,078, "Messenger of Allah" 3,391.**

Making those follow the rule means changing what a reader sees of a source's words. A blind find-and-replace is unsafe: "the Prophet" can name another prophet (Musa, Ibrahim); "Lord" and "God" sometimes translate a different Arabic word; a reader may need the sourced wording to check against the source.

**Proposed way, for the Owner to approve before anything is built:** a display-time fold (like the Bangla chapter fold, `standardTranslationFolds`), never an edit of the data files:
- Rabb and Allah: replace only where the Arabic of the same hadith has رب or الله, and keep "God" where the Arabic has إله.
- The Prophet: replace only when the sentence's narrator or speaker is our Prophet (the Arabic has النبي or رسول الله), and leave another prophet's name alone.
- A small "as sourced" toggle on the card, so the original wording is always one tap away.
- A check that counts every "Lord" and "God" left on a card against the Arabic, with a mutation that restores each.
