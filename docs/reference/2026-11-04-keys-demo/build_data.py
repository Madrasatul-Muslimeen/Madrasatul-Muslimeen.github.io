import json,glob,collections,re
Q='tools/quran-data-pull/output/'
S=json.load(open(Q+'surahs/surah_036.json'))
vf=json.load(open(Q+'verb-forms.json'))['values']
den=json.load(open(Q+'lemma-dictionary-en.json'))['entries']
dbn=json.load(open(Q+'lemma-dictionary-bn.json'))['entries']
roots36=set(); lem36=set()
ayahs=[]
for a in S['ayahs']:
  ws=[]
  for w in a['words']:
    m=w['morphology']; roots36.add(m['root']); lem36.add(m['lemma'])
    ws.append([re.sub(r'\s*[ۚۖۗۛۙۘ]\s*$','',w['arabic']).strip(), w['transliteration'], w['translation']['en'], w['translation']['bn'], m['root'], m['lemma'], m['pos']])
  ayahs.append({'n':a['ayah'],'ar':a['uthmaniText'],'en':a['translations']['en'],'bn':a['translations']['bn'],'w':ws})
# need also roots for hadith words
extra_roots={'اذن','دري','غرب','طلع','سجد','عرش','ذهب','رجع','قبل','شمس','جري'}
want=(roots36|extra_roots)-{''}
fam={r:collections.Counter() for r in want}; eg={}; lemcount=collections.Counter(); lemplaces={}
for f in sorted(glob.glob(Q+'surahs/surah_*.json')):
  s=json.load(open(f))
  for a in s['ayahs']:
    for w in a['words']:
      m=w['morphology']; r=m['root']; L=m['lemma']
      ref='%d:%d'%(s['surahNumber'],a['ayah'])
      if L in lem36 or r in extra_roots:
        lemcount[L]+=1
        lemplaces.setdefault(L,[])
        if len(lemplaces[L])<4 and ref not in [p[0] for p in lemplaces[L]]: lemplaces[L].append([ref,w['arabic'],w['translation']['en'],w['translation']['bn']])
      if r in fam:
        fam[r][L]+=1
        if (r,L) not in eg: eg[(r,L)]=[ref,w['arabic'],w['translation']['en'],w['translation']['bn']]
roots={r:{'n':sum(c.values()),'f':[[L,n]+eg[(r,L)] for L,n in c.most_common(8)]} for r,c in fam.items()}
lemmas={}
for L in set(lemcount):
  d={'n':lemcount[L],'p':lemplaces.get(L,[])}
  if L in den: d['en']=den[L]['m']
  if L in dbn: d['bn']='; '.join(dbn[L]['m'])
  if L in vf: d['v']={'f':vf[L].get('f'),'n':vf[L].get('n')}
  lemmas[L]=d
def ay(s,n):
  t=json.load(open(Q+'surahs/surah_%03d.json'%s)); a=t['ayahs'][n-1]
  return {'ref':'%d:%d'%(s,n),'sname':t['surahNameEnglish'],'ar':a['uthmaniText'],'en':a['translations']['en'],'bn':a['translations']['bn']}
related={'36:38':[ay(36,40),ay(13,2),ay(31,29),ay(35,13),ay(39,5)],'36:40':[ay(36,38),ay(21,33)]}
idx=json.load(open('tools/hadith-data-pull/output/ayah-hadith/36.json'))
out={'surah':{'n':36,'ar':S['surahNameArabic'],'en':S['surahNameEnglish']},'ayahs':ayahs,'roots':roots,'lemmas':lemmas,'related':related,'ayahHadith':idx}
open('docs/reference/2026-11-04-keys-demo/data.json','w').write(json.dumps(out,ensure_ascii=False,separators=(',',':'),sort_keys=True))
print(len(json.dumps(out,ensure_ascii=False)), len(roots), len(lemmas))
print(json.dumps(related['36:40'][1],ensure_ascii=False)[:300])
