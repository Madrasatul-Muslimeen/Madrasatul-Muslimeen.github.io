import json,glob,collections,unicodedata
R='/home/user/Madrasatul-Muslimeen.github.io/tools/quran-data-pull/output/'
L={}
for f in sorted(glob.glob(R+'surahs/surah_*.json')):
    d=json.load(open(f))
    for a in d['ayahs']:
        for w in a['words']:
            m=w.get('morphology') or {}
            lem=m.get('lemma')
            if not lem: continue
            e=L.setdefault(lem,{'lemma':lem,'count':0,'roots':collections.Counter(),'pos':collections.Counter(),'example':w['arabic'],'exampleRef':f"{d['surahNumber']}:{a['ayah']}:{w['position']}",'glossEn':None})
            e['count']+=1
            if m.get('root'): e['roots'][m['root']]+=1
            segs=[s for s in (m.get('pos') or '').split(' + ') if s!='Pronoun']
            e['pos'][segs[-1] if segs else '']+=1
mean=json.load(open(R+'lemma-meaning-index.json'))['values']
VERB={'Verb'}
PART_NOUN={'Noun','Proper Noun','Adjective','Personal Pronoun','Demonstrative Pronoun','Relative Pronoun','Imperative Verbal Noun'}
out=[]
for k,e in L.items():
    head=e['pos'].most_common(1)[0][0]
    cls='verb' if head in ('Verb','Imperative Verb') else ('noun' if head in ('Noun','Proper Noun','Adjective','Imperative Verbal Noun','Verbal Noun','Location Adverb','Time Adverb') else 'particle')
    if head in ('Personal Pronoun','Demonstrative Pronoun','Relative Pronoun'): cls='particle'
    out.append({'lemma':k,'count':e['count'],'root':(e['roots'].most_common(1)[0][0] if e['roots'] else None),
      'posTag':head,'posTags':dict(e['pos']),'pos':cls,'example':e['example'],'exampleRef':e['exampleRef'],
      'appGlossEn':mean.get(k,{}).get('en')})
out.sort(key=lambda x:-x['count'])
json.dump({'source':'tools/quran-data-pull/output/surahs/*.json morphology.lemma (QAC 0.4 Buckwalter converted to Arabic by pull.js BW2AR; ^ and # left unconverted)','lemmaCount':len(out),'occurrences':sum(x['count'] for x in out),'lemmas':out},open('lemmas.json','w'),ensure_ascii=False,indent=0)
print(len(out),sum(x['count'] for x in out),collections.Counter(x['pos'] for x in out),collections.Counter(x['posTag'] for x in out).most_common(30))
print(sum(1 for x in out if x['root']), len({x['root'] for x in out if x['root']}))
import re
odd=collections.Counter(c for x in out for c in x['lemma'] if not ('؀'<=c<='ۿ'))
print(odd)
