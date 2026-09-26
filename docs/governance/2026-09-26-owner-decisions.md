# Owner decisions — 26 Sep 2026

Recorded by the MMSA Architect, in the Owner's own words where given. Binding
until the Owner changes them; a later session must not ask these again.

| # | Question | Owner's answer | What it means |
|---|---|---|---|
| 1 | Replace the Asma ⋯ menu's icon buttons (✎C, 🗄C, +C, +N, 🔗) with words, and widen the classification dropdowns? | **"No."** | Keep the icons. (v08.82 already names the target classification in the ✎C/🗄C tooltips and marks the current dropdown.) |
| 2 | Pictures in imported Notes: store them (Firebase Storage / Blaze) or keep pointing to the website? | **"Keep pointing to the site."** | No picture storage. Imported WordPress Notes keep their images' original web addresses; Evernote attachments stay named placeholders. |
| 3 | Switch GitHub Pages to publish from an Action (for a minified build, first open under 3s)? | **"Leave it for now."** | Parked. First open stays ~3.4s on fast 4G; every later open ~1.1s. |
| 4 | The claim unit for Basic Arabic and Arabic in Depth (an open DDR item since MAP Phase 3). | **"Claiming for basic n Depth is per word. (Because It's in WbW)"** | Per word occurrence, the same unit as Word-by-Word. Unblocks both levels; they are refused today at the state model, data layer and Rules, so building them needs a Rules paste (to be combined with the lemma-progress paste). |
| 5 | Hadith text source. | **"Do b"** (26 Sep): full text inside the app, from a source that permits it. | **HadeethEnc.com first.** Its published API terms, quoted verbatim: *"No modification, addition, or deletion of the content. Clearly referring to the publisher and the source (HadeethEnc.com)."* The app will show HadeethEnc text unchanged, with HadeethEnc.com credited on every hadith. HadeethEnc is a curated encyclopedia organised by topic (Arabic, English, Bengali among others, each with an explanation), not complete books. Complete collections in Arabic (e.g. all of Sahih al-Bukhari) would come from OpenITI, whose licence could not be read from the sandbox (egress blocked) and is still to be confirmed before any of its text is used. |
| 6 | What to call a "lemma" on screen. | **"Call Lemma as 'Dictionary Word' (as it is the form to be checked in the dict, right?)"** | Reader-facing text says **Dictionary Word** (Bangla: অভিধানের শব্দ). Code identifiers keep `lemma`. The Owner also confirmed "Lemma progress rules are live." -- the gate is open (`docs/reports/2026-09-26-lemma-progress-enabled.md`). |
| 7 | Gate C2 for HadeethEnc: the permanent unit key for a HadeethEnc hadith. | **"Use HadeethEnc number"** (asked with `hadith:hadeethenc:4563` as the example). | A HadeethEnc hadith is keyed `hadith:hadeethenc:<HadeethEnc id>`, built with `buildUnitKey.hadith("hadeethenc", id)` -- a source id plus that source's own permanent number, i.e. the H1 §5 permanent form, not a name. Notes, bookmarks and "Studied" may be wired on it. **Scope: HadeethEnc only.** The legacy name-keyed form `app/records.html` builds (`hadith:bukhari:N`) is not decided by this and stays as it is. |
| 8 | OpenITI licence (CC BY-NC-SA 4.0, release 2025.1.9 on Zenodo, doi:10.5281/zenodo.3082463): non-commercial, credit OpenITI, share-alike; Arabic text only, no translations or grades. | **"Accept licence"** | OpenITI Hadith books may be imported, Arabic only, credited to OpenITI on every text, with the app non-commercial and anything derived from the text under the same licence. Measured from the sandbox on 26 Sep: zenodo.org and raw.githubusercontent.com are reachable (github.com/api.github.com are not); the full release is 5.9 GB, so books are selected from its 12 MB metadata file and fetched individually. |

Earlier decisions of 25 Sep 2026, for completeness: "all its forms" = the same
**lemma**; lemma knowledge is **confirmed once for all** its occurrences;
Ayah Card section C = Related (shared rarer words + same QCR collection / Asma
Name) **and** Connected (own Notes and Mapping folders, studied or not).
