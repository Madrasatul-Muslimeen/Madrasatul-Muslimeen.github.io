# usage: python3 build.py OUT.html AUDIO_DIR  (AUDIO_DIR holds audhubillah.mp3 and Abdullah_Basfar_192kbps.mp3 from everyayah.com; audio is not kept in the repository)
import base64,sys,pathlib
d=pathlib.Path(__file__).parent
a=lambda p:"data:audio/mpeg;base64,"+base64.b64encode(open(p,'rb').read()).decode()
t=(d/'template.html').read_text()
t=t.replace('__A1__',a(sys.argv[2]+'/audhubillah.mp3')).replace('__A2__',a(sys.argv[2]+'/Abdullah_Basfar_192kbps.mp3'))
out=sys.argv[1]; open(out,'w').write(t); print(len(t))
