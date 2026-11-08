# usage: python3 build.py OUT.html   (no audio is embedded: the page cuts the opening from the Owner's file in the browser)
import sys,pathlib
d=pathlib.Path(__file__).parent
open(sys.argv[1],'w').write((d/'template.html').read_text())
