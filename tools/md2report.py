import io, re, html, sys
md = io.open(sys.argv[1], encoding="utf-8").read()
def inline(t):
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', t)
    return t
out, lines, i = [], md.split("\n"), 0
while i < len(lines):
    l = lines[i]
    if l.startswith("|"):
        rows = []
        while i < len(lines) and lines[i].startswith("|"):
            rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
        head = rows[0]; body = [r for r in rows[1:] if not set("".join(r)) <= set("-: ")]
        out.append("<div class='tw'><table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>")
        for r in body: out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
        out.append("</tbody></table></div>"); continue
    if l.startswith("---") and set(l) <= set("-"): out.append("<hr>"); i += 1; continue
    m = re.match(r'^(#{1,6})\s+(.*)', l)
    if m: out.append(f"<h{len(m.group(1))}>{inline(m.group(2))}</h{len(m.group(1))}>"); i += 1; continue
    if re.match(r'^\d+\.\s', l):
        items = []
        while i < len(lines) and (re.match(r'^\d+\.\s', lines[i]) or (lines[i].startswith("   ") and lines[i].strip())):
            if re.match(r'^\d+\.\s', lines[i]): items.append(re.sub(r'^\d+\.\s', '', lines[i]))
            else: items[-1] += " " + lines[i].strip()
            i += 1
        out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>"); continue
    if l.startswith("- "):
        items = []
        while i < len(lines) and (lines[i].startswith("- ") or (lines[i].startswith("  ") and lines[i].strip() and items)):
            if lines[i].startswith("- "): items.append(lines[i][2:])
            else: items[-1] += " " + lines[i].strip()
            i += 1
        out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"); continue
    if not l.strip(): i += 1; continue
    para = []
    while i < len(lines) and lines[i].strip() and not lines[i].startswith(("|", "#", "- ", "---")) and not re.match(r'^\d+\.\s', lines[i]):
        para.append(lines[i]); i += 1
    if not para:
        # THE INDEX MUST ALWAYS ADVANCE, or this loops for ever.
        # A line can slip past every branch above and still be refused by the
        # paragraph scanner: the heading test needs whitespace after the
        # hashes, so a GitHub Actions line like "##[error]..." quoted inside a
        # report is not a heading, yet startswith("#") stops the scanner
        # consuming it. Nothing then increments i. Found when a CI report
        # quoting real "##[error]" output hung the generator indefinitely.
        # Emitting the line as its own paragraph keeps the output faithful and
        # guarantees progress.
        para.append(lines[i]); i += 1
    out.append("<p>" + inline(" ".join(para)) + "</p>")
CSS = """<style>
  :root { color-scheme: light dark;
    --bg:#fbfaf6; --fg:#1c1c1c; --muted:#5a5a5a; --rule:#e2ddcd;
    --card:#fffdf6; --accent:#1F3A6E; --code:#f2efe4; }
  @media (prefers-color-scheme: dark) { :root {
    --bg:#14161a; --fg:#e9e6df; --muted:#a2a09a; --rule:#2c3138;
    --card:#1a1d22; --accent:#9db8ea; --code:#22262c; } }
  * { box-sizing:border-box }
  body { margin:0; background:var(--bg); color:var(--fg);
    font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif; }
  main { max-width:56rem; margin:0 auto; padding:2.5rem 1.1rem 4rem; }
  h1 { font-size:1.85rem; line-height:1.25; margin:0 0 1rem; color:var(--accent); letter-spacing:-.01em }
  h2 { font-size:1.22rem; margin:2.4rem 0 .7rem; padding-top:1.1rem; border-top:1px solid var(--rule) }
  h3 { font-size:1.02rem; margin:1.5rem 0 .4rem; color:var(--muted); text-transform:uppercase; letter-spacing:.06em }
  li { margin:.32rem 0 }
  code { background:var(--code); padding:.1em .38em; border-radius:.3em;
    font:0.86em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; word-break:break-word }
  hr { border:0; border-top:1px solid var(--rule); margin:2rem 0 }
  .tw { overflow-x:auto; margin:1rem 0; border:1px solid var(--rule); border-radius:.55rem; background:var(--card) }
  table { border-collapse:collapse; width:100%; min-width:30rem; font-size:.93rem }
  th, td { text-align:left; padding:.62rem .8rem; border-bottom:1px solid var(--rule); vertical-align:top }
  th { background:rgba(31,58,110,.07); font-weight:700; white-space:nowrap }
  @media (prefers-color-scheme: dark) { th { background:rgba(157,184,234,.1) } }
  tr:last-child td { border-bottom:0 }
  @media (max-width:480px){ main{padding:1.6rem .9rem 3rem} h1{font-size:1.45rem} table{min-width:22rem} }
</style>"""
# The title was hardcoded to one report's own name, so every report generated
# afterwards carried the wrong title in its browser tab. It is derived from the
# document's own first H1 now, with that report's name as the fallback so
# nothing that already relied on it changes.
_h1 = re.search(r'^#\s+(.+)$', md, re.M)
_title = html.escape(_h1.group(1).strip()) if _h1 else 'QuranRevival — Reconciliation and MAP Phase 2 closure (2026-09-12)'
doc = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">\n'
 '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
 '<title>' + _title + '</title>\n'
 + CSS + '</head><body><main>\n' + "\n".join(out) + '\n</main></body></html>\n')
io.open(sys.argv[2], "w", encoding="utf-8").write(doc)
print("written", sys.argv[2])
