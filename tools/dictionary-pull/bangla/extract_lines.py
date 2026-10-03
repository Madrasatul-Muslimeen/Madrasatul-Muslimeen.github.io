"""Step 1. Read every glyph of the AQS Quraniyo Obhidhan PDF with its font and
position, and group the glyphs into lines, column by column.

    python3 extract_lines.py qab.pdf WORK      ->  WORK/lines.json

Needs pdfminer.six. The book is two columns a page; a glyph belongs to the
column its centre falls in, and to the line whose centre is within 0.55 of the
glyph's size.
"""
import json, sys
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTChar

pdf, work = sys.argv[1], sys.argv[2]

def chars(o):
    if isinstance(o, LTChar): yield o
    elif hasattr(o, '__iter__'):
        for c in o: yield from chars(c)

out = []
for pno, page in enumerate(extract_pages(pdf), start=1):
    W = page.width
    cols = [[], []]
    for c in chars(page):
        f = c.fontname.split('+')[-1]
        cols[0 if (c.x0 + c.x1) / 2 < W / 2 else 1].append(((c.y0 + c.y1) / 2, c.x0, c.x1, f, c.get_text(), c.size))
    for col, cs in enumerate(cols):
        cs.sort(key=lambda z: -z[0])
        lines = []
        for ch in cs:
            if lines and abs(lines[-1]['ym'] - ch[0]) < 0.55 * ch[5]: lines[-1]['c'].append(ch)
            else: lines.append({'ym': ch[0], 'c': [ch]})
        for l in lines:
            out.append({'p': pno, 'col': col, 'y': round(l['ym']),
                        'chars': sorted([[x0, x1, f, t, sz] for _, x0, x1, f, t, sz in l['c']])})
json.dump(out, open(f'{work}/lines.json', 'w'), ensure_ascii=False)
print(len(out), 'lines')
