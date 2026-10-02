# dictionary-pull: dictionary-source coverage, 2 Oct 2026

These are the scripts behind `docs/reports/2026-10-02-dictionary-source-coverage.md`. Nothing in `app/` uses them yet.

- `build_lemmas.py`: the Qur'an's 4,832 lemmas, read from `tools/quran-data-pull/output`.
- `slim.py`: streams the kaikki.org Arabic JSONL into a slim extract, kept out of the repository.
- `norm.py`: Arabic normalisation (diacritics, hamza forms, the extended-Buckwalter marks left by `BW2AR`).
- `match_wikt.py`: matches lemmas to Wiktionary headwords in confidence tiers. It writes `coverage-wiktionary.json`.
- `ejtaal.py`: places each root on a Lane or Hans Wehr page using ejtaal.net's index.

**Licences**
- `coverage-wiktionary.json` contains glosses from Wiktionary (via kaikki.org), **CC BY-SA 4.0**. Anything built from it must credit the Wiktionary contributors and keep the same licence.
- ejtaal.net states no licence for its index, so neither the index nor any page numbers derived from it are committed here. The recommended use is a plain link to `https://ejtaal.net/aa/#q=<root>`.
- The script paths point at the Architect's scratch area. Adjust them before re-running.
