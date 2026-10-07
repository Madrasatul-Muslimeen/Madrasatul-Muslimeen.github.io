#!/usr/bin/env python3
"""Makes app/img/asma-poster-frame.webp from the Owner's template (decision 85): the six per-Name places painted over in
the template's own cream, everything else (frame, banner, logos, pills) left exactly as drawn.
  python3 tools/asma-poster/make-frame.py docs/reference/2026-10-07-asma-poster-template-al-witr.png /tmp/frame.png
then save as WebP (quality 90) to app/img/asma-poster-frame.webp. Needs Pillow."""
from PIL import Image
import statistics, sys
src, out = sys.argv[1], sys.argv[2]
im=Image.open(src).convert("RGB"); px=im.load()
def ink(p): r,g,b=p; return (r+g+b)<690 or (r>200 and g<200 and b<160)
def cream(x0,y0,x1,y1):
    vals=[px[x,y] for y in range(y0,y1,3) for x in range(x0,x1,3) if not ink(px[x,y])]
    return tuple(int(statistics.median(v[i] for v in vals)) for i in range(3))
def fill(x0,y0,x1,y1,c):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): px[x,y]=c
# 1. title, inside the arch, row by row
c=cream(420,345,640,430)
for y in range(342,433):
    row=[x for x in range(300,760) if ink(px[x,y])]
    if not row: continue
    # the arch's own lines (orange and green, with a soft edge) sit within 45px of its outer edge on each side
    l=max(x for x in row if x <= row[0]+45)
    r=min(x for x in row if x >= row[-1]-45)
    if r-l < 60: continue
    fill(l+4,y,r-4,y,c)
# 2. Arabic name, inside the cartouche
c=cream(340,480,720,668); fill(338,476,717,670,c)
# 3. description
c=cream(215,698,845,1100); fill(212,696,848,1102,c)
# 4. the two reference texts
c=cream(118,1146,488,1200); fill(116,1146,490,1202,c)
c=cream(564,1146,938,1200); fill(562,1146,940,1202,c)
im.save(out)
print("cream", c)
