# usage: python3 build.py OUT.html OPEN.wav
# OPEN.wav = first ~7 s of the Owner's Surah al-Waqiah recording (mono, 32 kHz). The audio is NOT kept in the repository.
import sys,pathlib,base64
d=pathlib.Path(__file__).parent
t=(d/'template.html').read_text().replace('__OPEN__',base64.b64encode(open(sys.argv[2],'rb').read()).decode())
open(sys.argv[1],'w').write(t)
