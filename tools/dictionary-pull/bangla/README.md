# dictionary-pull/bangla: the Bangla meanings (decision 62)

Builds `tools/quran-data-pull/output/lemma-dictionary-bn.json`: a Bangla meaning
for each Qur'an Dictionary word that can be matched, read from the AQS
*Quraniyo Obhidhan* (কুরআনীয় অভিধান), Muhammad Abu Hena, ed. Muhammad Yahya,
Al Quran Academy London Bangladesh, 2nd ed. December 2015.

The PDF is not kept in the repository. Fetch it, and the Bijoy converter, into a
work folder, then run the five steps from the repository root:

```bash
W=/path/to/work
curl -L -o $W/qab.pdf https://archive.org/download/mujammufahras/qab.pdf
(cd $W && npm pack bijoy-unicode-converter@0.1.2 && tar xzf bijoy-unicode-converter-0.1.2.tgz)
pip install pdfminer.six
python3 tools/dictionary-pull/bangla/extract_lines.py $W/qab.pdf $W   # glyphs -> lines.json
python3 tools/dictionary-pull/bangla/assemble.py $W                   # lines -> runs per script
node    tools/dictionary-pull/bangla/convert.mjs $W $W/package        # Bijoy -> Unicode
python3 tools/dictionary-pull/bangla/segments.py $W                   # reading order -> entries
python3 tools/dictionary-pull/bangla/build_bn_dictionary.py $W        # entries -> lemmas
node    tools/i18n-verify/bangla-dictionary-data.mjs                  # 32 checks
```

The build is deterministic: the same PDF gives the same file, byte for byte.
How the matching works, and what it refuses to guess, is in the header of
`build_bn_dictionary.py` and in `docs/reports/2026-10-03-bangla-dictionary-data.md`.

**Licence.** The book is used for non-commercial study by the Owner's decision 62
(3 Oct 2026). A permission letter to the publisher is still on the reminder
list. Every place that shows a meaning must name the book. The converter is
MIT-licensed (Naim Howlader) and is fetched, not copied in.
