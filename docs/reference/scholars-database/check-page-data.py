"""Check that a Scholars Database page carries exactly its JSON file's data.

Run from the repository root:  python3 docs/reference/scholars-database/check-page-data.py v1.4
Checks: the JSON parses; the page's <script id="data"> JSON equals the JSON file; the page is the template with
only __DATA__ replaced; the data's own version names the same version. Exits 1 on any failure.
"""
import json, re, sys, pathlib

v = sys.argv[1] if len(sys.argv) > 1 else "v1.4"
here = pathlib.Path(__file__).parent
fails = []
data = json.loads((here / f"scholars-database-{v}.json").read_text(encoding="utf-8"))
page = (here / f"Scholars Database - {v}.html").read_text(encoding="utf-8")
tmpl = (here / "scholars-database.template.html").read_text(encoding="utf-8")
m = re.search(r'<script type="application/json" id="data">(.*?)</script>', page, re.S)
if not m:
    fails.append("no <script id=\"data\"> in the page")
else:
    embedded = json.loads(m.group(1))
    if embedded != data: fails.append("the page's embedded data differs from the JSON file")
    if page[:m.start(1)] + "__DATA__" + page[m.end(1):] != tmpl: fails.append("the page differs from the template outside the data")
if data.get("version") != v: fails.append(f"data version is {data.get('version')!r}, expected {v!r}")
ids = [r["id"] for r in data["rows"]]
if len(ids) != len(set(ids)): fails.append("duplicate row ids")
print(f"{v}: {len(data['rows'])} rows, {len(data.get('centuries', {}))} centuries")
for f in fails: print("FAIL:", f)
print("OK" if not fails else f"{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
