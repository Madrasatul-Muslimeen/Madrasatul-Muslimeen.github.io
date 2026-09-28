#!/usr/bin/env python3
"""Allocate the next application version: the MMSA Architect's one tool for it.

Run from the repository root, on the branch that carries the round:

    python3 tools/governance/allocate-version.py VER NEXT SHORT NOTE MILESTONE CHANGELOG

  VER        the version being allocated, e.g. 08.102 (read it off the ledger's
             nextUnallocated -- never off arithmetic; decision 17 allows 08.100+)
  NEXT       the number to record as nextUnallocated afterwards, e.g. 08.103
  SHORT      a few words for the ledger note and version-history.md
  NOTE       one sentence for the ledger allocation's note
  MILESTONE  the whole new "**Current milestone: vNN.NNN on `main`** (...)" paragraph
             for CLAUDE.md; the old one is demoted to "Previous milestone"
  CHANGELOG  the whole "## vNN.NNN — date — title" entry appended to CHANGELOG.md

It updates, together: app/js/version.js, the Programme Integration Ledger
(the old LIVE allocation becomes RELEASED), docs/governance/version-history.md,
CLAUDE.md and CHANGELOG.md. Afterwards run brief-integrity, programme-ledger
and programme-ledger-mutations: before the merge, exactly the checks that read
origin/main fail; after the merge all three must pass.

Moved into the repository from a session scratchpad on 28 Sep 2026 so it
survives a session change; it takes today's date from the system.
Only the Architect runs this. The Builder never bumps a version.
"""
import datetime, json, re, sys
TODAY = datetime.date.today().isoformat()
ver,next_,short,note,milestone,changelog=sys.argv[1:7]
L='docs/governance/programme-integration-ledger.json'
d=json.load(open(L))
for a in d['versionAllocations']:
  if a.get('status')=='LIVE': a['status']='RELEASED'
d['versionAllocations'].append({"version":ver,"owner":"quran","status":"LIVE","note":note,
 "integration":{"authorizedOn":TODAY,"integratedOn":TODAY,"method":"MERGE_PR","reference":"CHANGELOG.md"}})
d['main']['version']=ver; d['nextUnallocated']=next_
d['nextUnallocatedNote'].insert(0,f"v{ver} was allocated to {short}, {TODAY}.")
open(L,'w').write(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
v=open('app/js/version.js').read()
v=re.sub(r'export const APP_VERSION = "[\d.]+";',f'export const APP_VERSION = "{ver}";',v)
open('app/js/version.js','w').write(v)
open('docs/governance/version-history.md','a').write(f'{ver}: {short}. Allocated by the MMSA Architect.\n')
c=open('CLAUDE.md').read()
i=c.index('**Current milestone: v')
c=c[:i]+milestone.strip()+'\n\n**Previous milestone: v'+c[i+len('**Current milestone: v'):]
open('CLAUDE.md','w').write(c)
cl=open('CHANGELOG.md').read().rstrip('\n')+'\n\n'+changelog.strip()+'\n'
open('CHANGELOG.md','w').write(cl)
