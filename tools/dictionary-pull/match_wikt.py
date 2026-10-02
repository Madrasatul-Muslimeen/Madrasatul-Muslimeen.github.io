import json,collections,difflib
from norm import voc,skel,loose
L=json.load(open('lemmas.json'))['lemmas']
ents=[]
for l in open('kaikki-slim.jsonl'):
    e=json.loads(l)
    if not e['g']: continue
    if not any('؀'<=c<='ۿ' for c in e['w']): continue
    forms=[c for c in e['c'] if c and '#' not in c and not c.startswith(':') and any('ً'<=ch<='ْ' for ch in c)] or [e['w']]
    ents.append({'w':e['w'],'pos':e['pos'],'forms':forms[:2],'g':e['g'],'formOnly':e['formOnly']})
idx={'voc':collections.defaultdict(list),'skel':collections.defaultdict(list),'loose':collections.defaultdict(list)}
for k,e in enumerate(ents):
    for f in set(e['forms']+[e['w']]):
        for t,fn in (('voc',voc),('skel',skel),('loose',loose)):
            key=fn(f)
            if k not in idx[t][key]: idx[t][key].append(k)
import re
AR=re.compile('[\u0621-\u0652\u0670\u0671]+')
infl={'voc':collections.defaultdict(set),'skel':collections.defaultdict(set)}
for l in open('kaikki-slim.jsonl'):
    e=json.loads(l)
    if e['g'] or not e['c'] or e['pos']!='verb': continue
    segs=re.split(r'\s#\s',' '.join(e['c']))
    form=e['w']
    for sg in segs:
        toks=AR.findall(sg.split(' of ')[0]) if ' of ' in sg else AR.findall(sg)
        voct=[t for t in toks if any('\u064b'<=c<='\u0652' for c in t)]
        if voct: form=voct[0]
        for tgt in re.findall(r'\bof ([\u0621-\u0652\u0670\u0671]+)',sg):
            infl['voc'][voc(form)].add(tgt); infl['skel'][skel(form)].add(tgt)
def lookup_lemma(tgt,pos):
    c=[k for k in idx['voc'].get(voc(tgt),[]) if ents[k]['pos']==pos and not ents[k]['formOnly']]
    return c[0] if c else None
def resolve_formof(e):
    m=re.search(r'of ([\u0621-\u0652\u0670\u0671]+)',e['g'])
    if not m: return None
    c=[k for k in idx['voc'].get(voc(m.group(1)),[]) if not ents[k]['formOnly']]
    if not c: return None
    pr=[k for k in c if ents[k]['pos']==e['pos']] or [k for k in c if ents[k]['pos']=='verb'] or c
    return ents[pr[0]]['g']
NOUNISH={'noun','adj','name','num','pron','adv'}
def compat(cls,p):
    if cls=='verb': return p=='verb'
    if cls=='noun': return p in NOUNISH
    return p!='verb'
def pick(lem,cands):
    v=voc(lem['lemma'])
    def score(k):
        e=ents[k]
        return (compat(lem['pos'],e['pos']), not e['formOnly'], max(difflib.SequenceMatcher(None,v,voc(f)).ratio() for f in e['forms']), e['pos']==('name' if lem['posTag']=='Proper Noun' else e['pos']))
    return max(cands,key=score)
res=[];stats=collections.Counter()
for lem in L:
    if lem['posTag'] in ('Time Adverb','Location Adverb'): lem=dict(lem,pos='particle')
    m=None
    for t,fn in (('voc',voc),('skel',skel),('loose',loose)):
        key=fn(lem['lemma']); c=list(idx[t].get(key,[]))
        if lem['pos']=='verb' and key.endswith(chr(0x627)): c+=idx[t].get(key[:-1]+chr(0x64A),[])
        cc=[k for k in c if compat(lem['pos'],ents[k]['pos'])]
        if cc:
            k=pick(lem,cc); m=(t,k,True);break
    if not m and lem['pos']=='verb':
        for t in ('voc','skel'):
            fn=voc if t=='voc' else skel
            tg=infl[t].get(fn(lem['lemma']),set())
            ks=[k for k in (lookup_lemma(x,'verb') for x in tg) if k is not None]
            if ks:
                v=voc(lem['lemma'])
                k=max(ks,key=lambda k:difflib.SequenceMatcher(None,v,voc(ents[k]['forms'][0])).ratio())
                m=('viaInflection-'+t,k,True);break
    if not m and lem['pos']=='noun':
        sk=skel(lem['lemma'])
        for suf,rep in (('ون',''),('ين',''),('ات','ة'),('ات','')):
            if sk.endswith(suf) and len(sk)>4:
                c=[k for k in idx['skel'].get(sk[:-2]+rep,[]) if compat('noun',ents[k]['pos'])]
                if c: m=('pluralStripped',pick(lem,c),True);break
    if not m:
        for t,fn in (('voc',voc),('skel',skel)):
            c=idx[t].get(fn(lem['lemma']),[])
            if c: m=(t+'-anyPOS',pick(lem,c),False);break
    r={'lemma':lem['lemma'],'count':lem['count'],'pos':lem['pos'],'root':lem['root']}
    if m:
        t,k,pc=m;e=ents[k]
        r.update(matched=True,tier=t,posCompatible=pc,headword=e['forms'][0],wiktPos=e['pos'],gloss=e['g'],formOfOnly=e['formOnly'],resolvedGloss=(resolve_formof(e) if e['formOnly'] else e['g']),
                 url='https://en.wiktionary.org/wiki/'+e['w']+'#Arabic')
    else: r['matched']=False
    res.append(r)
tot=sum(x['count'] for x in res)
def summ(f):
    s=[x for x in res if f(x)]
    return {'lemmas':len(s),'lemmaPct':round(100*len(s)/len(res),1),'occurrences':sum(x['count'] for x in s),'occPct':round(100*sum(x['count'] for x in s)/tot,1)}
summary={'any':summ(lambda x:x['matched']),
 'posCompatible':summ(lambda x:x['matched'] and x['posCompatible']),
 'posCompatibleNonFormOf':summ(lambda x:x['matched'] and x['posCompatible'] and not x['formOfOnly']),
 'strictVocalised':summ(lambda x:x['matched'] and x['tier']=='voc'),
 'byTier':dict(collections.Counter(x.get('tier','none') for x in res)),
 'withUsableGloss':summ(lambda x:x['matched'] and x['posCompatible'] and bool(x.get('resolvedGloss'))),
 'byPos':{p:{'matched':sum(1 for x in res if x['matched'] and x['posCompatible'] and x['pos']==p),'total':sum(1 for x in res if x['pos']==p)} for p in ('verb','noun','particle')}}
json.dump({'source':'Wiktionary via kaikki.org Arabic JSONL (fetched 2026-10-02, file last-modified 2026-09-28)','licence':'CC BY-SA 4.0 (and GFDL), Wiktionary contributors','entriesWithGloss':len(ents),'summary':summary,'matches':res},open('coverage-wiktionary.json','w'),ensure_ascii=False,indent=0)
print(json.dumps(summary,ensure_ascii=False,indent=1))
