// PCF MSA J106 (the Owner, 14 Nov 2026, demo tick 7A): Dua is its own module, so it no longer lives on the Hadith pages.
// Old Dua addresses on hadith-study.html and hadith-collections.html (a bookmark, the Continue strip, a Word card's Back, a
// way-back link from before today) are sent to dua-study.html, which reopens the same dua. PURE: it only builds an address.
//   ?view=dua&duaPage=<p>&dua=<n>[&dword=<n>:<pos>]  ->  dua-study.html?back=1&view=dua&dua=<n>[&dword=<n>:<pos>]
//   ?view=dua[&duaPage=<p>]                           ->  dua-study.html?back=1
//   ?resume=dua:<n>                                   ->  dua-study.html?resume=dua:<n>
// "back=1" is the way-back law: Dua Study shows its own Back to the page that sent the reader.
export function duaRedirectTarget(search) {
  const q = new URLSearchParams(search);
  const num = (k) => (/^\d{1,5}$/.test(q.get(k) ?? "") ? Number(q.get(k)) : null);
  const resume = /^dua:(\d{1,5})$/.exec(q.get("resume") ?? "");
  if (q.get("view") === "dua") {
    const dua = num("dua");
    let to = "dua-study.html?back=1";
    if (dua != null) {
      to += `&view=dua&dua=${dua}`;
      const dword = /^(\d{1,5}):(\d{1,5})$/.exec(q.get("dword") ?? "");
      if (dword && Number(dword[1]) === dua) to += `&dword=${dword[1]}:${dword[2]}`;
    }
    return to;
  }
  if (resume) return `dua-study.html?resume=dua:${Number(resume[1])}`;
  return null;
}
