import sys,json
out=open('kaikki-slim.jsonl','w')
n=0
for line in sys.stdin:
    try: e=json.loads(line)
    except: continue
    n+=1
    forms=[]
    for f in e.get('forms',[]) or []:
        t=f.get('tags') or []
        if 'canonical' in t or 'romanization' not in t and ('masculine' in t and 'singular' in t and False):
            forms.append(f.get('form'))
    gl=None
    for s in e.get('senses',[]) or []:
        g=s.get('glosses') or s.get('raw_glosses')
        if g and 'form-of' not in (s.get('tags') or []) :
            gl=g[0];break
    if gl is None:
        for s in e.get('senses',[]) or []:
            g=s.get('glosses')
            if g: gl=g[0];break
    formof=any('form-of' in (s.get('tags') or []) or s.get('form_of') or s.get('alt_of') for s in e.get('senses',[]) or [])
    allform=all(('form-of' in (s.get('tags') or []) or s.get('form_of') or s.get('alt_of')) for s in e.get('senses',[]) or []) if e.get('senses') else False
    root=None
    for t in e.get('head_templates',[]) or []:
        pass
    ety=e.get('etymology_templates') or []
    for t in ety:
        if t.get('name') in ('ar-root',):
            a=t.get('args',{}); root=''.join(a.get(str(i),'') for i in range(1,5))
    out.write(json.dumps({'w':e.get('word'),'pos':e.get('pos'),'c':forms,'g':gl,'formOnly':allform,'root':root},ensure_ascii=False)+'\n')
print(n,file=sys.stderr)
