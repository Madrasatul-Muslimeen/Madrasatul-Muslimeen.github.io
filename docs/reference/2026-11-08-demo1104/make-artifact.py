# Makes the single-file Artifact version of the demo from index.html (the viewer's skeleton supplies <html>/<head>/<body>, and a
# viewer cannot download a file, so "Copy the times" shows the JSON in a box and copies it). Usage:
#   python3 -I docs/reference/2026-11-08-demo1104/make-artifact.py <output.html>
import re, sys
here = __file__.rsplit("/", 1)[0]
s = open(here + "/index.html", encoding="utf8").read()
s = re.sub(r'<!doctype html>\s*<html lang="en">\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", s)
s = s.replace("</head>\n<body>\n", "").replace("</body>\n</html>\n", "")
s = s.replace("<title>Ayah Times Demo</title>", '<title>Ayah Times Demo</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
s = s.replace("main{max-width:760px;margin:0 auto;padding:16px}", "main{max-width:760px;margin:0 auto;padding-block:16px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}")
dark = "--bg:#121a2b;--card:#1a2540;--ink:#eef1f8;--mut:#a9b3c8;--line:#34425f;--acc:#8fb0ff;--gold:#d8b45a;--ok:#5fd39a;--bad:#ff8a80;--sel:#22305a"
s = s.replace("*{box-sizing", ':root[data-theme="dark"]{' + dark + ";color-scheme:dark}\n*{box-sizing", 1)
s = s.replace('<div id="list" role="list"></div>', '<textarea id="out" readonly hidden rows="8" aria-label="times" style="width:100%;margin-top:10px;font:12px monospace;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:8px"></textarea>\n<div id="list" role="list"></div>')
a, b = s.index("  const b = new Blob("), s.index("async function analyse")
s = s[:a] + '  const txt = JSON.stringify(out, null, 1), ta = $("out"); ta.hidden = false; ta.value = txt; ta.focus(); ta.select();\n  try { navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) {}\n}\n' + s[b:]
s = s.replace('dl:"Save the times"', 'dl:"Copy the times"').replace('dl:"সময়গুলো সংরক্ষণ"', 'dl:"সময়গুলো কপি করুন"').replace("Save the times</button>", "Copy the times</button>")
open(sys.argv[1], "w", encoding="utf8").write(s)
