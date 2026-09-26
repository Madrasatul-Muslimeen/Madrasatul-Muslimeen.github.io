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

Earlier decisions of 25 Sep 2026, for completeness: "all its forms" = the same
**lemma**; lemma knowledge is **confirmed once for all** its occurrences;
Ayah Card section C = Related (shared rarer words + same QCR collection / Asma
Name) **and** Connected (own Notes and Mapping folders, studied or not).
