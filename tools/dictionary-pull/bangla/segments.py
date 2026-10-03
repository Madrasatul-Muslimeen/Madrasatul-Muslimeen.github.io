"""Step 4. Read the book in order and cut it into (Arabic, Bangla) segments.

    python3 segments.py WORK      ->  WORK/segments.json

Reading order is page, left column then right, top to bottom, from page 9
(the dictionary proper). Each segment is an Arabic run, the Bangla that follows
it, whether it starts an entry, and its PDF page. An entry starts a line, or
follows a ";" or "।" inside an entry.
"""
import json, re, sys
work = sys.argv[1]
A = [r for r in json.load(open(f'{work}/unicode.json')) if r['p'] >= 9]
A.sort(key=lambda r: (r['p'], r['col'], -r['y']))
stream = []
for r in A:
    for j, (k, t) in enumerate(r['parts']):
        if stream and stream[-1][0] == k: stream[-1][1] += ' ' + t
        else: stream.append([k, t, j == 0, r['p']])
# A verb pair is printed present / past with the "/" and the root's brackets set
# in the Bangla font, which splits it into separate Arabic runs. Join an Arabic
# run, a run of only "/", "(", ")" and spaces, and the next Arabic run.
j = []
for it in stream:
    if len(j) >= 2 and it[0] == 'ar' and j[-1][0] == 'bj' and re.fullmatch(r'[\s/()]+', j[-1][1]) and j[-2][0] == 'ar':
        sep = j.pop()[1].strip()
        j[-1][1] += sep + ' ' + it[1] if sep != '/' else '/' + it[1]
    else: j.append(it)
stream = j
segs = []
for i, (k, t, first, page) in enumerate(stream):
    if k != 'ar': continue
    nxt = stream[i + 1][1] if i + 1 < len(stream) and stream[i + 1][0] == 'bj' else ''
    prev = stream[i - 1][1] if i > 0 and stream[i - 1][0] == 'bj' else ''
    head = first or bool(re.search(r'[;।|]\s*$', prev))
    segs.append([t.strip(), nxt.strip(), head, page])
json.dump(segs, open(f'{work}/segments.json', 'w'), ensure_ascii=False)
print(len(segs), 'segments,', sum(1 for s in segs if s[2]), 'start an entry')
