import json, glob, collections, base64, io
SP="/tmp/claude-0/-home-user-Madrasatul-Muslimeen-github-io/7995a3d3-a191-5ad5-a112-0d6c38dac170/scratchpad"
R="/home/user/Madrasatul-Muslimeen.github.io"
D=R+"/tools/hadith-data-pull/output/dua/"
base=json.load(open(SP+'/prep/demo-data.json'))
summ=json.load(open(D+'cards.json'))
cards={}; vow={}; words={}; wmap={}; gram={}
for f in glob.glob(D+'cards-*.json'):
    for c in json.load(open(f))['cards']: cards[c['dua']]=c
for f in glob.glob(D+'vowels-*.json'): vow.update(json.load(open(f))['duas'])
for f in glob.glob(D+'words-*.json'):
    w=json.load(open(f)); p=w['page']
    for n,v in w['duas'].items(): wmap[n]=(v,w['entries'])
for f in glob.glob(D+'grammar-*.json'): gram.update(json.load(open(f))['duas'])
he={}
for lang in ('en','bn'):
    for f in glob.glob(R+f'/tools/hadith-data-pull/output/hadeethenc/{lang}/*.json'):
        for h in json.load(open(f)).get('hadiths',[]): he.setdefault(h['id'],{})[lang]=h
# hadith books group
books=[]
for bi,b in enumerate(summ['books']):
    cs=sorted([c for c in cards.values() if c['anchor'][0]==bi], key=lambda c:-len(c['members']))
    items=[]
    for c in cs:
        v=vow.get(str(c['dua']))
        if not v: continue
        items.append({"n":c['dua'],"places":len(c['members']),"ar":' '.join(v['v']),"std":c['anchor'][2]})
        if len(items)>=8: break
    books.append({"en":b['titleEn'],"ar":b['titleAr'],"bn":b['short']['bn'],"count":len(cs),"items":items})
# Rasulullah group: most narrated with words
ras=[]
for c in sorted(cards.values(), key=lambda c:-len(c['members'])):
    v=vow.get(str(c['dua']))
    if v:
        m=None
        for hid in c['hadeethenc']:
            h=he.get(str(hid))
            if h and 'en' in h: m={"en":h['en']['title'],"bn":h.get('bn',{}).get('title'),"id":hid}; break
        ras.append({"n":c['dua'],"places":len(c['members']),"ar":' '.join(v['v']),"mean":m})
    if len(ras)>=20: break
# prophets
PRO=[("Ādam and Ḥawwāʾ","আদম ও হাওয়া","7:23","Forgiveness after the mistake","ভুলের পর ক্ষমা প্রার্থনা"),
("Nūḥ","নূহ","71:28","Forgiveness for parents and believers","পিতা-মাতা ও মুমিনদের জন্য ক্ষমা"),
("Nūḥ","নূহ","23:29","A blessed landing place","বরকতময় অবতরণস্থল"),
("Ibrāhīm and Ismāʿīl","ইবরাহীম ও ইসমাঈল","2:127","Accept this from us","আমাদের পক্ষ থেকে কবুল করুন"),
("Ibrāhīm","ইবরাহীম","14:40","Make me establish the prayer","আমাকে সালাত কায়েমকারী করুন"),
("Ibrāhīm","ইবরাহীম","14:41","Forgive me, my parents and the believers","আমাকে, পিতা-মাতা ও মুমিনদের ক্ষমা করুন"),
("Ibrāhīm","ইবরাহীম","26:83","Wisdom and the company of the righteous","প্রজ্ঞা ও সৎকর্মশীলদের সঙ্গ"),
("Mūsā","মূসা","20:25","Open my chest for me","আমার বক্ষ প্রশস্ত করে দিন"),
("Mūsā","মূসা","28:16","I have wronged myself","আমি নিজের উপর জুলুম করেছি"),
("Mūsā","মূসা","28:24","In need of whatever good You send","আপনি যে কল্যাণই পাঠান, আমি তার মুখাপেক্ষী"),
("Mūsā","মূসা","7:151","Forgive me and my brother","আমাকে ও আমার ভাইকে ক্ষমা করুন"),
("Yūnus","ইউনুস","21:87","From inside the darkness","অন্ধকারের ভেতর থেকে"),
("Ayyūb","আইয়ুব","21:83","Harm has touched me","আমাকে কষ্ট স্পর্শ করেছে"),
("Zakariyyā","যাকারিয়া","3:38","Grant me good offspring","আমাকে পবিত্র সন্তান দান করুন"),
("Zakariyyā","যাকারিয়া","21:89","Do not leave me alone","আমাকে একা রাখবেন না"),
("Sulaymān","সুলাইমান","27:19","Inspire me to be grateful","আমাকে কৃতজ্ঞ হওয়ার তাওফীক দিন"),
("Sulaymān","সুলাইমান","38:35","Forgive me and grant me a kingdom","আমাকে ক্ষমা করুন ও রাজত্ব দান করুন"),
("Yūsuf","ইউসুফ","12:101","Take me as a Muslim","আমাকে মুসলিম অবস্থায় মৃত্যু দিন"),
("Lūṭ","লূত","26:169","Save me and my family","আমাকে ও আমার পরিবারকে রক্ষা করুন"),
("Shuʿayb","শুআইব","7:89","Judge between us with truth","আমাদের মধ্যে সত্য দিয়ে ফয়সালা করুন"),
("ʿĪsā","ঈসা","5:114","Send down a table from heaven","আসমান থেকে খাদ্য-ভরা দস্তরখান নাযিল করুন")]
pro=[]
for name,nbn,ref,ten,tbn in PRO:
    s,a=map(int,ref.split(':'))
    d=json.load(open(R+f'/tools/quran-data-pull/output/surahs/surah_{s:03d}.json'))
    ay=d['ayahs'][a-1]; assert ay['ayah']==a
    pro.append({"who":name,"whoBn":nbn,"ref":ref,"titleEn":ten,"titleBn":tbn,"ar":ay['uthmaniText'],"en":ay['translations']['en'],"bn":ay['translations']['bn'],"sEn":d['surahNameEnglish']})
# featured dua 2 WbW
v=vow['2']['v']; wm,entries=wmap['2']; g=gram['2']['g']
toks=[]
for i,t in enumerate(v):
    e=wm['w'][i] if i<len(wm['w']) else -1
    if e!=-1:
        x=entries[e]; toks.append({"ar":t,"q":{"place":x[0],"translit":x[3],"en":x[4],"bn":x[5],"root":x[6],"lemma":x[7],"count":len(x[10])}})
    elif str(i) in g:
        y=g[str(i)]; toks.append({"ar":t,"d":{"lemma":y[0],"root":y[1],"pos":y[2]}})
    else: toks.append({"ar":t})
h=he['5503']
feat={"n":2,"places":len(cards[2]['members']),"titleEn":"Sayyid al-Istighfār, the best way to ask forgiveness","titleBn":"সাইয়েদুল ইস্তিগফার, ক্ষমা চাওয়ার শ্রেষ্ঠ দুআ","tokens":toks,
 "en":h['en']['hadeeth'],"bn":h['bn']['hadeeth'],"enAttr":h['en']['attribution'],"bnAttr":h['bn']['attribution'],"heading":cards[2]['heading'],"std":"Bukhari 6306"}
# banner crop
from PIL import Image
im=Image.open(R+'/docs/reference/2026-10-07-asma-poster-template-al-witr.png').convert('RGB')
crop=im.crop((48,1212,1008,1450)); buf=io.BytesIO(); crop.save(buf,'WEBP',quality=80)
banner="data:image/webp;base64,"+base64.b64encode(buf.getvalue()).decode()
base.update({"books":books,"rasul":ras,"prophets":pro,"feat":feat,"banner":banner})
json.dump(base,open(SP+'/prep/demo-data2.json','w'),ensure_ascii=False)
print(len(books),[b['count'] for b in books], len(ras), len(pro), len(toks), sum(1 for t in toks if 'q' in t), sum(1 for t in toks if 'd' in t), len(banner)//1024,'KB')
