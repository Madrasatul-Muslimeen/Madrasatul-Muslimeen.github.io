# Bundled Qur'an typefaces

Built by `tools/fonts/build-fonts.mjs` — do not hand-edit. Read that file's
header for why they are self-hosted and self-subsetted rather than linked from
Google Fonts.

| File | Face | Licence |
|---|---|---|
| `scheherazade.woff2` | Scheherazade New (SIL) | OFL 1.1 |
| `notonaskh.woff2` | Noto Naskh Arabic (Google) | OFL 1.1 |
| `amiriquran.woff2` | Amiri Quran (Khaled Hosny) | OFL 1.1 |

All three are SIL Open Font License 1.1 — free to bundle and redistribute,
including in a hosted web app, with no attribution required in the interface.

Each is subset to the 74 codepoints the shipped Qur'an text actually uses,
with **every** OpenType layout feature kept. Verified when built: the subsets
render identically to the complete originals.
