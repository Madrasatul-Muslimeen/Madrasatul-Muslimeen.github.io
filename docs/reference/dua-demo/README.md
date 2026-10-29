# Dua module demo: source files

The published demo is https://claude.ai/artifact/9R9UYsxz5r7JoM38jF7PZ8 (PMS MSA J104). `dua-module-demo-v1.04.html` is
the page exactly as published as v1.04 on 30 Oct 2026.

To make the next demo version: edit `head.html` (styles) and `body.html` (page and script; `const VERSION` and the
badge carry the demo number, which only goes up, rule dua130), then join them with the data:

    python3 -c "d=open('demo-data2.json').read(); open('dua-module-demo.html','w').write(open('head.html').read()+open('body.html').read().replace('__DATA__', d.replace('</','<\\/')))"

`demo-data2.json` is made by `prep1.py` then `prep2.py` (run from a scratch folder; they read the repository's Dua,
HadeethEnc and Qur'an data, and two downloads: Hisn al-Muslim `https://cdn.jsdelivr.net/gh/asellam/HisnElMuslim@master/hisn.json`
(MIT) into `dl/hisn/hisn.json`, and the morning and evening adhkār `https://cdn.jsdelivr.net/gh/Seen-Arabic/Morning-And-Evening-Adhkar-DB@main/en.json`
(MIT) into `dl/adhkar/en.json`; fix the `SP` path at the top of each script). `shot.cjs` takes the phone and computer
screenshots used to check a version before it is published (Playwright).

This is a picture for the Owner's approval, not app code: nothing under this folder is loaded by the app.
