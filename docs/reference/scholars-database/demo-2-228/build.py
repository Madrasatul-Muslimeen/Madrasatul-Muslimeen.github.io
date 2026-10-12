import json,re,sys,html
root='/home/user/Madrasatul-Muslimeen.github.io/'
src=json.load(open(root+'docs/reference/scholars-database/demo-2-228/sources.json'))
s2=json.load(open(root+'tools/quran-data-pull/output/surahs/surah_002.json'))
a=[x for x in s2['ayahs'] if x['ayah']==228][0]
tr=a['translations']
def tval(k):
    v=tr.get(k); 
    return v if isinstance(v,str) else (v or {}).get('text','') if isinstance(v,dict) else ''
en=next((tval(k) for k in tr if k.startswith('en')),''); bn=next((tval(k) for k in tr if k.startswith('bn')),'')
# Unmapped authors: Claude's draft attribution, marked as such on the page.
EXTRA={'tafsir-ibn-abi-zamanin':('32 Maliki · 30 Gen1','Maliki'),
       'al-dur-al-masun-lil-samin-al-halabi':('35 Shafiʿi · 31 Gen2','Shafiʿi'),
       'jamia-al-bayan-aliji':('35 Shafiʿi · 31 Gen2','Shafiʿi')}
APPROACHES=[('28','Sahaba','The Companions','Their words reach us inside the narration books below.'),
 ('29','Tābiʿīn','The Successors','Their words reach us inside the narration books below.'),
 ('30','Gen1','Generation 1','to 656 AH'),('31','Gen2','Generation 2','to about 1112 AH (1700)'),
 ('Gen3','Gen3','Generation 3','to 1343 AH (1924)'),('Gen4','Gen4','Generation 4','to 1945'),
 ('Gen5','Gen5','Generation 5','to 2001'),('Gen6','Gen6','Generation 6','after 2001'),
 ('32','Maliki','Maliki',''),('33','Hanbali','Hanbali',''),('34','Hanafi','Hanafi',''),('35','Shafiʿi','Shafiʿi',''),
 ('36','Groups','Groups and sects','Named as a group, never mixed with the madhabs.')]
QURU=re.compile(r'قروء|القرء|الأقراء|أقراء|القروء|قرء')
def excerpt(t):
    m=QURU.search(t)
    if not m: return 0,min(len(t),1800)
    i=m.start(); s=max(0,i-350); 
    k=t.rfind('.',0,s); k2=t.rfind('\n',0,s); s=max(k,k2)+1 if max(k,k2)>0 else s
    e=min(len(t),i+1900); k=t.find('.',e); k2=t.find('\n',e)
    cands=[x for x in (k,k2) if x!=-1 and x-e<400]; e=(min(cands)+1) if cands else e
    return s,e
out=[]
for p in src['passages']:
    appr=p.get('approaches'); madhab=p.get('madhab'); draft=False
    if not appr and p['slug'] in EXTRA: appr,madhab=EXTRA[p['slug']]; draft=True
    codes=[c.strip().split(' ')[0] for c in (appr or '').split('·') if c.strip()]
    if p['slug'].endswith('jalalayn'): codes=[c for c in codes if c!='28']
    t=p['text']; s,e=excerpt(t)
    out.append(dict(slug=p['slug'],book=p['bookTitle'],en=p['scholarEn'],ar=p.get('scholarAr') or '',died=p['diedAH'],
      madhab=madhab or '',codes=codes,draft=draft,url=p['url'],text=t,s=s,e=e,note=p.get('note') or '',groups=appr or ''))
data=dict(ayah=a['uthmaniText'],en=en,bn=bn,fetched=src['fetchedAt'],passages=out,approaches=APPROACHES,
  notFetched=src.get('notFetched',[]))
tpl=open('/tmp/claude-0/demo/page.html').read()
open(sys.argv[1],'w').write(tpl.replace('/*DATA*/null',json.dumps(data,ensure_ascii=False).replace('</','<\\/')))
print(len(out), en[:80], bn[:40])
