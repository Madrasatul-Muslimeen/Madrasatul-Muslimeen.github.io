import json,re,collections,bisect
js=open('ejtaal/mawrid-indexes.js').read()
arrs={}
for m in re.finditer(r'(?m)^([a-z0-9_]+)\s*=\s*\[(.*?)\];?\s*$',js,re.S):
    arrs[m.group(1)]=re.findall(r"'([^']*)'",m.group(2))
print({k:len(v) for k,v in arrs.items()})
L=json.load(open('lemmas.json'))['lemmas']
roots=collections.Counter(); 
for x in L:
    if x['root']: roots[x['root']]+=x['count']
print('roots',len(roots), 'rootless lemmas',sum(1 for x in L if not x['root']), 'occ',sum(x['count'] for x in L if not x['root']))
print('root chars',collections.Counter(c for r in roots for c in r))
def norm(r): return re.sub('[إآٱأءؤئ]','ا',r).replace('ى','ي')
tot_occ=sum(x['count'] for x in L)
out={'source':'ejtaal.net Arabic Almanac (mawrid-indexes.js, v6.1)','books':{}}
for b,name in (('hw4',"Hans Wehr 4th ed."),('ll',"Lane's Lexicon"),('ls','Lane supplement')):
    a=arrs[b]
    ex=set(a)
    sorted_ok=sum(1 for i in range(1,len(a)) if a[i] and a[i-1] and a[i]<a[i-1])
    per={}
    for r in roots:
        n=norm(r)
        # emulate binarySearch result approx: last index i with a[i] <= n
        idx=max(i for i in range(len(a)) if a[i]<=n) if any(a[i]<=n for i in range(len(a))) else None
        per[r]={'exactListed':n in ex,'pageIndex':idx}
    exl=[r for r in roots if per[r]['exactListed']]
    occ_ex=sum(x['count'] for x in L if x['root'] and per[x['root']]['exactListed'])
    out['books'][b]={'name':name,'indexLength':len(a),'outOfOrderEntries':sorted_ok,
       'rootsExactlyListed':len(exl),'rootsExactlyListedPct':round(100*len(exl)/len(roots),1),
       'occurrencesWhoseRootIsExactlyListedPct':round(100*occ_ex/tot_occ,1),
       'perRoot':per}
    print(b,len(a),'outoforder',sorted_ok,'exact',len(exl),round(100*len(exl)/len(roots),1),round(100*occ_ex/tot_occ,1))
out['urlPatterns']={'openApp':'https://ejtaal.net/aa/#hw4=<pageIndex>,ll=<pageIndex>  (or #q=<root letters> to let the site search)','pageImage':'https://ejtaal.net/aa/img/<book>/<floor(pageIndex/100)>/<book>-<pageIndex zero-padded to 4>.png'}
out['note']="Each index is an ARRAY OF PAGES: element i is the first root printed on page i (scan index, not printed page number; books[book].offset gives the front-matter offset). Any root resolves to SOME page by binary search; 'exactly listed' only means the root happens to start a page. pageIndex here = last i with index[i] <= root (normalised: hamza forms->ا, ى->ي), mirroring mawrid-app.js binarySearch approximately."
json.dump(out,open('coverage-ejtaal.json','w'),ensure_ascii=False,indent=0)
