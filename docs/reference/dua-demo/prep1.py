import json, glob, re, sys, collections
SP="/tmp/claude-0/-home-user-Madrasatul-Muslimeen-github-io/7995a3d3-a191-5ad5-a112-0d6c38dac170/scratchpad"
R="/home/user/Madrasatul-Muslimeen.github.io/tools"
def bare(s):
    s=re.sub(r'[ً-ٰٟۖ-ۭـ࣓-ࣿ]','',s)
    s=re.sub('[أإآٱ]','ا',s).replace('ى','ي').replace('ة','ه').replace('ؤ','و').replace('ئ','ي')
    s=re.sub(r'[^ء-ي\s]',' ',s)
    return s.split()
def grams(t): return {' '.join(t[i:i+3]) for i in range(len(t)-2)}
# dua cards
cards={}
for f in glob.glob(R+'/hadith-data-pull/output/dua/cards-*.json'):
    for c in json.load(open(f))['cards']: cards[c['dua']]=c
df=collections.Counter()
cg={}
for n,c in cards.items():
    g=grams(bare(c['text'])); cg[n]=g; df.update(g)
inv=collections.defaultdict(set)
for n,g in cg.items():
    for x in g:
        if df[x]<=40: inv[x].add(n)
# hadeethenc
he={}
for lang in ('ar','en','bn'):
    for f in glob.glob(R+f'/hadith-data-pull/output/hadeethenc/{lang}/*.json'):
        for h in json.load(open(f)).get('hadiths',[]):
            he.setdefault(h['id'],{})[lang]=h
hg={i:grams(bare(v['ar'].get('hadeeth',''))) for i,v in he.items() if 'ar' in v}
hinv=collections.defaultdict(set)
for i,g in hg.items():
    for x in g: hinv[x].add(i)
def best(g, inv, pool):
    sc=collections.Counter()
    for x in g:
        for n in inv.get(x,()): sc[n]+=1
    if not sc: return None,0
    n,s=sc.most_common(1)[0]
    return n, s/max(1,len(g))
hisn=json.load(open(SP+'/dl/hisn/hisn.json'))
chap=list(hisn.items())
GROUPS=[("wake","Waking and sleeping","ঘুম ও জাগরণ","☾",[0,28,29,30,31]),
("morning","Morning and evening","সকাল ও সন্ধ্যা","☀",[26,27]),
("salah","Adhān and ṣalāh","আযান ও সালাত","۞",list(range(14,26))+[32,33]),
("worry","Worry, distress and fear","দুশ্চিন্তা, কষ্ট ও ভয়","♡",list(range(34,47))),
("home","Home and masjid","ঘর ও মসজিদ","⌂",list(range(9,14))),
("wudu","Toilet and wuḍūʾ","শৌচাগার ও ওযু","◌",[5,6,7,8]),
("clothes","Clothes","পোশাক","◇",[1,2,3,4]),
("food","Food and fasting","খাবার ও সিয়াম","◐",list(range(68,77))),
("travel","Travel and the market","সফর ও বাজার","➶",list(range(95,106))),
("ill","Illness, death and graves","অসুস্থতা, মৃত্যু ও কবর","✚",list(range(49,61))),
("weather","Rain, wind and the new moon","বৃষ্টি, বাতাস ও নতুন চাঁদ","☂",list(range(61,68))),
("people","Family and people","পরিবার ও মানুষ","☺",[47,48]+list(range(77,95))+list(range(108,115))),
("forgive","Forgiveness and dhikr","ক্ষমা প্রার্থনা ও যিকর","✦",[107,129,130,131]),
("hajj","Ḥajj and ʿUmrah","হজ্জ ও উমরাহ","◆",list(range(115,122))),
("other","Other moments","অন্যান্য সময়","…",[106]+list(range(122,129))+[132])]
seen=sorted(i for g in GROUPS for i in g[4]); assert seen==list(range(133)), set(range(133))-set(seen)
out=[]; nmatchC=nmatchH=total=0
for gid,en,bn,ic,idx in GROUPS:
    chs=[]
    for i in idx:
        title,v=chap[i]; items=[]
        for a in v['Adhkar']:
            total+=1
            g=grams(bare(a['Text']))
            n,s=best(g,inv,None); hid,hs=best(g,hinv,None)
            card=None
            if n and s>=0.3:
                c=cards[n]; card={"n":n,"places":len(c['members'])}; nmatchC+=1
            mean=None
            if hid and hs>=0.5 and 'en' in he[hid]:
                e=he[hid]['en']; b=he[hid].get('bn',{})
                mean={"id":hid,"en":e.get('title'),"bn":b.get('title'),"enAttr":e.get('attribution'),"bnAttr":b.get('attribution')}; nmatchH+=1
            items.append({"ar":a['Text'],"count":a.get('Count',1),"ref":a.get('Reference',''),"card":card,"mean":mean})
        chs.append({"i":i+1,"title":title,"items":items})
    out.append({"id":gid,"en":en,"bn":bn,"icon":ic,"chapters":chs,"n":sum(len(c['items']) for c in chs)})
print("hisn items",total,"matched to a card",nmatchC,"with HadeethEnc meaning",nmatchH, file=sys.stderr)
# Quranic duas
QREFS=["1:6","2:127","2:201","2:250","2:286","3:8","3:16","3:38","3:53","3:147","3:193","7:23","7:47","7:126","10:85","14:40","14:41","17:24","17:80","18:10","20:25","20:114","21:83","21:87","23:29","23:97","23:109","23:118","25:65","25:74","26:83","27:19","28:16","28:24","40:7","46:15","59:10","60:4","66:8","71:28"]
q=[]
for r in QREFS:
    s,a=map(int,r.split(':'))
    d=json.load(open(R+f'/quran-data-pull/output/surahs/surah_{s:03d}.json'))
    ay=d['ayahs'][a-1]; assert ay['ayah']==a
    q.append({"ref":r,"sEn":d['surahNameEnglish'],"sAr":d['surahNameArabic'],"ar":ay['uthmaniText'],"en":ay['translations']['en'],"bn":ay['translations']['bn']})
# morning/evening
me=json.load(open(SP+'/dl/adhkar/en.json'))
adh=[{"ar":x['content'],"en":x['translation'],"tr":x.get('transliteration',''),"count":x['count'],"cd":x.get('count_description','')} for x in me]
# all duas list: top 12 most narrated
top=sorted(cards.values(), key=lambda c:-len(c['members']))[:12]
vow={}
for f in glob.glob(R+'/hadith-data-pull/output/dua/vowels-*.json'):
    vow.update(json.load(open(f))['duas'])
tl=[{"n":c['dua'],"places":len(c['members']),"heading":c['heading'],"words":' '.join(vow[str(c['dua'])]['v']) if str(c['dua']) in vow else None} for c in top]
json.dump({"groups":out,"quran":q,"adhkar":adh,"top":tl,"cardsTotal":len(cards),"hisnTotal":total,"matchC":nmatchC,"matchH":nmatchH},open(SP+'/prep/demo-data.json','w'),ensure_ascii=False)
