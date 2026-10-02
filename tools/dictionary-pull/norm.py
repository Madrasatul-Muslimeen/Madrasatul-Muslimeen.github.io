import re,unicodedata
HARAKAT=re.compile('[ً-ْٰٕٖٓٔ-ٟۖ-ۭـ]')
def qac_fix(s):
    s=re.sub(r'[0-9@\[\].,]','',s)
    s=s.replace('^','ٓ').replace('#','ٔ')
    return s
def compose(s):
    s=s.replace(chr(0x622),chr(0x621)+chr(0x627))             # alef-madda -> hamza+alef
    if s.startswith(chr(0x627)+chr(0x653)): s=chr(0x621)+s     # initial alef+maddah
    s=s.replace(chr(0x653),'')                                  # other maddah: drop
    # tatweel+hamza -> hamza (seat-agnostic marker)
    s=s.replace('ـٔ','ء')
    s=s.replace('آ','آ').replace('أ','أ').replace('ؤ','ؤ').replace('ئ','ئ').replace('ىٔ','ئ')
    s=unicodedata.normalize('NFC',s)
    return s
def ortho(s):
    s=s.replace(chr(0x671),chr(0x627))
    s=s.replace(chr(0x649)+chr(0x670),chr(0x649))
    s=s.replace(chr(0x648)+chr(0x670),chr(0x627))
    s=s.replace(chr(0x670),chr(0x627))
    s=s.replace(chr(0x640),'')
    return s
def voc(s):
    s=ortho(compose(qac_fix(s)))
    s=s.replace('ْ','')  # sukun optional
    s=re.sub('َ(?=ا)','',s)   # fatha before alef redundant
    s=re.sub('ِ(?=ي)','',s)
    s=re.sub('ُ(?=و)','',s)
    s=re.sub('[ً-ِ]$','',s)  # optional final short vowel / tanwin? keep fatha on verbs: drop all for leniency
    s=s.replace('ى','ي')
    return s
def skel(s):
    s=voc(s)
    return HARAKAT.sub('',s)
def loose(s):
    s=skel(s)
    s=s.replace(chr(0x629),chr(0x647))
    for c in (0x623,0x625,0x624,0x626): s=s.replace(chr(c),chr(0x621))
    s=s.replace(chr(0x621)+chr(0x627),chr(0x621))   # ءا ~ ء
    return s
