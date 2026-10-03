"""Step 2. Turn each line's glyphs into runs of text, one run per script.

    python3 assemble.py WORK      ->  WORK/assembled.json

The Arabic is set in Majidi (real Unicode) and the Bangla in SutonnyMJ, a
legacy "Bijoy" font whose bytes are not Unicode; step 3 converts it.
- Arabic: harakat are dropped (matching uses bare letters), the letters are put
  right-to-left by position, and a word break is a gap of 0.12 of the size.
- Bangla: kept in the Bijoy byte order, with one repair (place_marks).
"""
import json, re, sys
work = sys.argv[1]
L = json.load(open(f'{work}/lines.json'))
MARK = re.compile('[ً-ٰۖ-ۭـ﻿]')

def place_marks(cs):
    # Bijoy draws a ref (©) or a vowel mark as a zero-width glyph at the right
    # edge of the letter it belongs to, but the PDF may store it a glyph or two
    # later, which turns ধর্ম into "ধমর্" and আল্লাহ into "আলস্নাহ". Put each
    # one straight after the letter whose right edge it sits on.
    base, marks = [], []
    for x0, t, x1 in cs:
        (marks if x1 - x0 < 0.3 and t.strip() else base).append((x0, t, x1))
    out = list(base)
    for x0, t, x1 in marks:
        best = None
        for i, (b0, bt, b1) in enumerate(out):
            if bt.strip() and abs(b1 - x0) <= 0.6 and (best is None or abs(b1 - x0) < abs(out[best][2] - x0)): best = i
        if best is None:
            j = next((i for i, (b0, _, _) in enumerate(out) if b0 > x0), len(out)); out.insert(j, (x0, t, x1))
        else: out.insert(best + 1, (x0, t, x1))
    return [t for _, t, _ in out]

res = []
for ln in L:
    runs, prev = [], None
    for x0, x1, f, t, sz in ln['chars']:
        kind = 'bj' if f.startswith('Sutonny') else 'ar'
        if kind == 'ar' and MARK.fullmatch(t): continue
        gap = (x0 - prev[1]) if prev else 0
        if runs and runs[-1]['k'] == kind:
            if kind == 'ar' and gap >= 0.12 * sz: runs[-1]['c'].append((x0 - 0.01, ' ', x0 - 0.01))
            runs[-1]['c'].append((x0, t, x1))
        else: runs.append({'k': kind, 'c': [(x0, t, x1)]})
        prev = (x0, x1)
    parts = []
    for r in runs:
        if r['k'] == 'ar': txt = ''.join(t for x, t, _ in sorted(r['c'], key=lambda z: -z[0])).strip()
        else: txt = ''.join(place_marks(r['c']))
        if txt.strip(): parts.append([r['k'], txt])
    if parts: res.append({'p': ln['p'], 'col': ln['col'], 'y': ln['y'], 'parts': parts})
res.sort(key=lambda r: (r['p'], r['col'], -r['y']))
json.dump(res, open(f'{work}/assembled.json', 'w'), ensure_ascii=False)
print(len(res), 'lines assembled')
