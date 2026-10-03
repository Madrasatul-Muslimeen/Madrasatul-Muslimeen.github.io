"""Step 5. Match the book's entries to the Qur'an's lemmas and write the Bangla
dictionary the Word card reads.

    python3 build_bn_dictionary.py WORK
        ->  tools/quran-data-pull/output/lemma-dictionary-bn.json

Run from the repository root. The book's headwords carry few or no harakat, so
an entry is matched by its bare letters and then has to agree with the lemma
on everything the book does print:
- kind: a Bangla verbal noun (করা, হওয়া, ...) or a present/past pair is a verb
  and only meets a verb lemma; anything else only meets a noun or particle;
- root: a pair's bracketed root must be the lemma's root (يزود (زود) زاد is not
  زَادَ "to increase", whose root is زيد);
- shadda: the book's shadda must be in the lemma (كتَّاب is not كِتَٰب), and a
  pair without one names a Form I verb;
- hamza: a medial or final hamza is a letter (سأل is not سال).
An entry that still fits two lemmas is left out, unless they are one word (an
assimilated al-'s shadda) or one is at least 20 times as frequent.
Match tiers, strongest first: "lemma" (the lemma's spelling), "stem" (an
inflected corpus lemma such as يُضَٰعِفُ with its person prefix or plural
ending off), "form" (a noun's spelling as it occurs in the Qur'an, when it
belongs to one lemma only). A lemma that has a "lemma" match keeps only those:
the weaker tiers are where look-alike words got in.
"""
import json, re, sys, collections, unicodedata
work = sys.argv[1]
R = 'tools/quran-data-pull/output/'
N = lambda x: unicodedata.normalize('NFC', x)
segs = [(a, N(g), h, p) for a, g, h, p in json.load(open(f'{work}/segments.json'))]
lem = json.load(open(R + 'lemmas-index.json'))['values']
pos = json.load(open(R + 'lemma-pos-index.json'))['values']
def sk(s,dag='ا'):
    s=re.sub('^ا\\^','آ',s).replace('ا^','ا').replace('ٰ',dag)
    s=re.sub('[ً-ٟۖ-ۭـ^#@`\\d﻿]','',s)
    # A madda is a letter: آمن is not أمن. The corpus writes it ءَا or ا^ at the
    # start of a word; a plain initial hamza on alif is folded, as the book
    # often leaves it out.
    s=re.sub('^(آ|ءا|ا\\^)','ءا',s)
    s=re.sub('^[أإٱ]','ا',s)
    for a,b in [('ٱ','ا'),('آ','ءا'),('أ','ء'),('إ','ء'),('ى','ي'),('ة','ه'),('ؤ','ء'),('ئ','ء')]: s=s.replace(a,b)
    return re.sub('[^ء-ي]','',s)
isverb=lambda l: any(p in ('Verb','Imperative Verb') for p,_ in pos.get(l,[]))
by=collections.defaultdict(set)
for l in lem:
    by[sk(l,'ا')].add(l)
    # a defective verb's last letter: the corpus has رَءَا where the book has رأى
    if isverb(l) and sk(l,'ا').endswith('ا') and len(sk(l,'ا'))>=3: by[sk(l,'ا')[:-1]+'ي'].add(l)
    # a dagger alif the book writes plainly, or leaves out; dropping it is only
    # safe on a longer word ("كتب" must not reach كِتَٰب)
    if len(sk(l,''))>=4: by[sk(l,'')].add(l)
STOP=re.compile(N(r'^\s*[,।;:)(]|^\s*(দেখুন|এবং|বা|শব্দটি|আক্ষরিক অর্থে|শব্দ দুইটি|এর|কর্ম|নিকটে আসে|এর সঙ্গে|যেমন|ক্রিয়ার|বহুবচন|একবচন|দ্বিবচন)(?=[\s,;।:)(/]|$)'))
# (each word must end there: "বা" is "or", but বান্দা and বাগান are meanings)
GRAM=re.compile(N(r'(বাচ্য|বচন|লিঙ্গ|কারক|কতৃর্|কর্তৃ|পুরুষ|বর্তমানকাল|অতীতকাল)'))
TRAIL=re.compile(N(r'[,\s]*(দেখুন|কর্মবাচ্যীয় রূপ|বহুবচন|একবচন|দ্বিবচন|যেমন|স্ত্রী|পুং|কর্ম বা ক্রিয়া বিণ|ক্রিয়া বিণ|বা)\s*$'))
def clean(g):
    g=re.sub(r'[।.]?\s*[০-৯]{1,3}\s*$','',g.strip())  # a page number at a page foot
    g=g.split(';')[0]
    g=re.sub(r'\([^)]*\)','',g)
    g=re.sub(r'মূল ও উপরোক্ত.*','',g)
    g=re.sub(r'\([^)]*$','',g)
    g=re.sub(r'\s+',' ',g).strip(' ,।:')
    for _ in range(3): g=TRAIL.sub('',g).strip(' ,।:')
    # a trailing item that is a grammar note (gender, number, case) is not a meaning
    it=[x.strip() for x in g.split(',')]
    while len(it)>1 and GRAM.search(it[-1]): it.pop()
    return ', '.join(x for x in it if x)
occ2=collections.defaultdict(set)
for l,v in lem.items():
    for o in v: occ2[o].add(l)
roots=json.load(open(R+'roots-index.json'))['values']
o2r={}
for rt,v in roots.items():
    for o in v: o2r[o]=rt
lroot={}
for l,v in lem.items():
    c=collections.Counter(o2r[o] for o in v if o in o2r)
    if c: lroot[l]=c.most_common(1)[0][0]
def rk(s):
    s=re.sub('[ً-ٟۖ-ۭـ\\s]','',s) if 'ّ' not in s else s
    dbl='ّ' in s
    s=re.sub('[^ء-ي]','',s.replace('ى','ي'))
    s=re.sub('[ءأإآئؤ]','ا',s)
    if dbl and len(s)==2: s+=s[-1]
    return s
def bookroot(ar):
    r=pairparts(ar)[1]
    if r: return rk(r)
    if ispair(ar):
        p=rk(ar.split('/')[-1])
        if len(p)==3: return p
    return None
wf=json.load(open(R+'word-forms-index.json'))['forms']
byform=collections.defaultdict(set)
for f in wf:
    k=sk(f[0]); k=k[2:] if k.startswith('ال') and len(k)>3 else k
    for o in f[4]: byform[k]|=occ2[o]
# Some corpus lemmas are inflected forms (يُضَٰعِفُ, ٱشْتَمَلَتْ, مُسَبِّحُون).
# Their stem, with the person prefix or the plural/feminine ending taken off,
# is a second, weaker key, used only when the exact key finds nothing.
loose=collections.defaultdict(set); stemsof={}
for l in lem:
    k=sk(l,'ا'); v=isverb(l)
    stems={k}
    if v and len(k)>=4 and k[0] in 'يتن': stems.add(k[1:])
    for suf in (('ت','وا','ن') if v else ('ون','ين','ات')):
        for x in list(stems):
            if x.endswith(suf) and len(x)-len(suf)>=3: stems.add(x[:-len(suf)])
    for x in stems-{k}: loose[x].add(l)
    stemsof[l]=stems
def lookup(form,verbal=False):
    c,h=lookup0(form,verbal)
    if c: return c,h
    k=sk(form.replace(' ',''))
    if len(loose.get(k,()))==1: return set(loose[k]),'stem'
    return set(),None
def lookup0(form,verbal=False):
    k=sk(form)
    if k in by: return set(by[k]),'lemma'
    k2=sk(form.replace(' ',''))
    # two letters the PDF printed apart are only joined when a mark shows they
    # were one glyph cluster; "س ن" alone is two fragments, not a word
    if ' ' in form and len(k2)<=2 and not re.search('[ً-ٰ]',form): return set(),None
    if k2 in by: return set(by[k2]),'lemma'
    kk=k2[2:] if k2.startswith('ال') and len(k2)>3 else k2
    if kk in by: return set(by[kk]),'lemma'
    if not verbal and len(kk)>=3 and len(byform.get(kk,()))==1: return set(byform[kk]),'form'
    return set(),None
def ispair(ar):
    # a verb is printed as a present/past pair; when the "/" is lost the
    # bracketed root still marks it
    return '/' in ar or bool(re.search(r'[)(][^)(]*[)(]',ar))
def pairparts(ar):
    """A verb pair as printed: present and past, in either order, with the root
    in brackets that come out reversed or empty. Returns (pasts, root)."""
    inside=[x.strip() for x in re.findall(r'[)(]([^)(]*)[)(]',ar)]
    root=next((x.replace(' ','') for x in inside if x.strip()),None)
    if not root:
        # "قال( )قيل/يقيل": the brackets came out empty and the root follows them
        m=re.search(r'[)(]\s*[)(]\s*([^\s/)(]+)',ar)
        if m: root=m.group(1)
    out=re.sub(r'[)(][^)(]*[)(]','/',ar)
    out=re.sub(r'(^|[\s/])ي\s+','\\1ي',out)   # "ي جرد" is one word
    ps=[p for p in re.split(r'[/\s]+',out) if p]
    pasts=[p for p in ps if not p.startswith('ي') and p!=root]
    if root and len(rk(root))==3:
        # a hollow verb's long alif is sometimes lost: "كن" for كان
        r=rk(root)
        pasts=[r[0]+'ا'+r[2] if len(rk(p))==2 and rk(p)==r[0]+r[2] else p for p in pasts]
    return pasts,root
def pastform(ar):
    p=pairparts(ar)[0]
    return p[-1] if p else ''
def forms(ar):
    # The root is printed in brackets beside a verb pair, and the brackets come
    # out reversed; drop it, it is not a word.
    ar=re.sub(r'[)(][^)(]*[)(]',' ',ar)
    out=[]
    for f in re.split('[/،,+()]',ar):
        f=f.strip()
        if not f: continue
        # (two whole words, "الله أكبر", are a phrase and are looked up whole,
        # which finds nothing: a phrase is not a spelling of either word)
        out.append(f)
    return out
VERBG=re.compile(N(r'(করা|হওয়া|ওয়া|ানো|থাকা|আসা|বলা|দেখা|ওঠা|রাখা|ফেলা|পড়া|ধরা|মারা|ছাড়া|চলা|জানা|শোনা|বোঝা|মানা|ভাঙা|ভাঙ্গা|গড়া|ঢাকা|লেখা|খোলা|তোলা|বসা|ভরা|কাটা|ডাকা|হারা|ঘোরা|জমা|বাঁধা|টানা|ছোঁড়া|মোছা|ফেরা|ঝরা|গলা|বাসা)(?=[\s,;।)]|$)'))
def judge(si):
    ar,g,head,_page=segs[si]
    g=re.sub(r'^\s*\([^)]{0,40}\)\s*','',g)
    nh = si+1>=len(segs) or segs[si+1][2]
    if not head: return 'not-head',None,None
    if re.match(r'^\s*[০-৯\d]',g) or re.search(N('আয়াত নং'),g) or re.match(N(r'^\s*(হওয়ার|করার|থাকার)\s'),g) or STOP.match(g) or re.match(r"^\s*['‘’\"]",g) or not re.search('[ঀ-৿]{2}',g): return 'stop',None,None
    gl=clean(g)
    # A gloss that stops without punctuation was cut by an Arabic word inside
    # it; a single cut word is not a meaning.
    if not re.search(r'[;।.)]\s*$',g) and ',' not in gl and not nh: return 'cut',None,gl
    if re.fullmatch(r'[\d০-৯\s,]+',gl) or gl in ('এর','ও','এ','সে') or len(gl)<3 or re.search('[ٓ]',ar) or gl.startswith(N('সূরা')) or re.match(r'^(দেখুন|এবং|বা)$',gl): return 'junk',None,gl
    verbal = ispair(ar) or bool(VERBG.search(gl.split(',')[0].strip()))
    fs=pairparts(ar)[0] if ispair(ar) else forms(ar)
    cands=set(); h=None
    for form in fs:
        c,hw=lookup(form,verbal)
        if c: cands|=c; h=h or hw
    if not cands: return 'nomatch',None,gl
    cands={c for c in cands if isverb(c)==verbal}
    if not cands: return 'kind',None,gl
    br=bookroot(ar) if verbal else None
    if br:
        cands={c for c in cands if lroot.get(c)==br}
        if not cands: return 'root',None,gl
    if verbal and not ispair(ar):
        # a single verb headword: its shadda must agree too (برج is not تَبَرَّجَ)
        cands={c for c in cands if ('ّ' in c[1:])==('ّ' in ar)}
        if not cands: return 'form',None,gl
    if verbal and ispair(ar):
        # the book's pair names a Form I verb unless it is written with shadda
        bookshadda=any('ّ' in p for p in pairparts(ar)[0])
        pk={sk(p.replace(' ','')) for p in pairparts(ar)[0]}
        cands={c for c in cands if ('ّ' in c[1:])==bookshadda and (sk(c,'ا') in pk or any(c in loose.get(k,()) for k in pk))}
        if not cands: return 'form',None,gl
    # a shadda the book prints inside the word must be in the lemma too
    # (كتَّاب "scribes" is not كِتَٰب "book")
    if re.search('.ّ',re.sub(r'^\S\s*[ًٌٍَُِ]?ّ','',ar.replace(' ',''))) and not verbal:
        cands={c for c in cands if 'ّ' in c[1:]}
        if not cands: return 'shadda',None,gl
    if len(cands)>1:
        # "رَّحِيم" and "رَحِيم" are one word, the first carrying the shadda
        # an assimilated al- leaves; they share the meaning
        if len({re.sub('^(.)ّ',r'\1',c) for c in cands})==1: return 'ok:same',cands,gl
        # one reading far more common than the rest is the one the entry means
        cs=sorted(cands,key=lambda c:-len(lem[c]))
        if len(lem[cs[0]])>=20*sum(len(lem[c]) for c in cs[1:]): return 'ok:dominant',{cs[0]},gl
        return 'ambiguous',cands,gl
    return 'ok:'+h,cands,gl

entries = {}
why = collections.Counter()
for si in range(len(segs)):
    w, cands, gl = judge(si); why[w] += 1
    if not w.startswith('ok'): continue
    tier = w.split(':')[1]
    for c in cands:
        entries.setdefault(c, []).append((tier, gl, segs[si][3]))
out = {}
for l in sorted(entries):
    rows = entries[l]
    if any(t in ('lemma', 'same', 'dominant') for t, _, _ in rows):
        rows = [r for r in rows if r[0] in ('lemma', 'same', 'dominant')]
    seen, m, p = set(), [], []
    for t, g, page in rows:
        if g in seen: continue
        seen.add(g); m.append(g); p.append(page)
    out[l] = {'m': m, 'p': p, 't': rows[0][0]}
occ = sum(len(lem[l]) for l in out); tot = sum(len(v) for v in lem.values())
doc = {
    'source': "Quraniyo Obhidhan (কুরআনীয় অভিধান), Muhammad Abu Hena, ed. Muhammad Yahya, "
              "Al Quran Academy London Bangladesh (AQS), 2nd edition, December 2015; "
              "PDF https://archive.org/download/mujammufahras/qab.pdf",
    'licence': "Used for non-commercial study by the Owner's decision 62 (3 Oct 2026); "
               "permission from the publisher not yet obtained. Credit the book on every use.",
    'built': 'tools/dictionary-pull/bangla (5 steps, see README.md)',
    'shape': "entries[lemma] = { m: [Bangla meaning, ...] in the book's order, "
             "p: [PDF page of each], t: match tier of the first }",
    'counts': {'lemmas': len(out), 'of': len(lem), 'occurrenceCoverage': round(occ / tot, 4)},
    'entries': out,
}
with open(R + 'lemma-dictionary-bn.json', 'w') as f:
    json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
print(dict(why))
print('lemmas with a Bangla meaning', len(out), 'of', len(lem), '- occurrence coverage %.1f%%' % (100 * occ / tot))
