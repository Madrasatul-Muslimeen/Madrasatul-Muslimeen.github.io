// Shared OpenITI mARkdown parser -- issue #314.
//
// Used by BOTH openiti-split.mjs (which writes the split output) and
// tools/i18n-verify/openiti-split.mjs (which re-derives the same "words" from
// the untouched source .txt file and checks nothing was dropped). Sharing
// this module is not circular: the round-trip check compares the SPLIT
// OUTPUT ON DISK against a fresh, independent re-read of the source text, and
// the only thing shared is the definition of "what counts as a marker,
// stripped from the words" -- necessary so both sides mean the same thing by
// "word", and load-bearing precisely because it is the one place that
// definition can go wrong for every book at once.
//
// MEASURED ON THE 11 PULLED FILES (26 Sep 2026), not assumed:
//   - `#META#` ... `#META#Header#End#` is a fixed preamble, skipped whole.
//   - `### |` / `### ||` / `### |||` mark heading depth 1/2/3 EXCEPT in the
//     two books where `### |||` is reused as the hadith-number marker
//     (Tirmidhi, Riyad al-Salihin) -- there it is never a heading.
//   - Ibn Majah and Darimi carry NO `### ` heading at all; their heading (a
//     flat, single-level "bab" list -- no kitab division is marked in this
//     edition) is `# | <n> ( ... )`, distinguishable from a hadith-number
//     line because a hadith-number line is `# <digits> ` with NO pipe.
//   - `~~` continues the previous logical line (heading or paragraph alike).
//   - `PageV01P013`-shaped page markers and `msNNNN` milestone markers can
//     appear INLINE, mid-sentence, not only on their own line -- stripped
//     from the text, recorded in `pageRefs`.
//   - `@QB@`/`@QE@` wrap an embedded Qur'an quotation. Not in the issue's own
//     marker list, but found on inspection (e.g. Bukhari hadith 1's own
//     chapter heading) -- left in, the text would show literal "@QB@" to a
//     reader, which is not a word, so these two tokens are stripped too.
//   - A "chapter" for this split's purposes is the nearest enclosing DEPTH-1
//     heading only (the 11 books' own deeper divisions -- Bukhari's bab/
//     sub-bab, Tirmidhi's bab -- are kept as extra breadcrumb entries in
//     `chapterPath`, but grouping/shard boundaries are depth-1 only). This
//     matches what the issue actually asks the UI to browse: "book" already
//     names one of the 11 works, so "chapter" is its next division down,
//     which for every one of the 11 is (or degrades gracefully to) a flat
//     list at the SAME nesting depth.
//
// NUMBERING STYLES (measured; the issue's own table, confirmed per book):
//   "inline-number"     Bukhari, Abu Dawud, Nasa'i, Ibn Majah, Muwatta',
//                        Ahmad, Darimi -- a hadith opens `# <n> ...`.
//   "triple-pipe-number" Tirmidhi (`### ||| <n>`), Riyad al-Salihin
//                        (`### ||| <n>/<m>-`, where <m> is the traditional
//                        number and <n> its position within the chapter --
//                        <m> is what this split uses).
//   "sequential"        Muslim, Nawawi's Forty -- no number marker at all.
//                        Every "# "-opened paragraph with real content (not
//                        a bare page/milestone marker) is numbered by its
//                        own order in the book. NEVER presented as the
//                        book's traditional number (the issue's own words).

export const META_END = "#META#Header#End#";

const PAGE_REF_RE = /PageV\d{2}P\d{3,4}/g;
const MILESTONE_RE = /\bms\d{3,}\b/g;
const QURAN_WRAP_RE = /@Q[BE]@/g;

/** Every page marker literally present in a raw line, before stripping. */
export function extractPageRefs(rawLine) {
  return rawLine.match(PAGE_REF_RE) || [];
}

/** Strips markers that are not words, joins whitespace/wrapping into one line. */
export function stripMarkers(rawLine) {
  return rawLine
    .replace(PAGE_REF_RE, " ")
    .replace(MILESTONE_RE, " ")
    .replace(QURAN_WRAP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips a single layer of balanced "(" ... ")" around already-trimmed heading text. */
function unwrapParens(s) {
  const t = s.trim();
  if (t.startsWith("(") && t.endsWith(")")) return t.slice(1, -1).trim();
  return t;
}

const HEADING_RE = /^### (\|{1,3})\s?(.*)$/;
const FLAT_HEADING_RE = /^# \| (\d+)\s?(.*)$/;
// Architect review: Musnad Ahmad also opens 173 narrations as "# * 14 - ..."
// -- the star marks the additions ('zawa'id) of Ahmad's son 'Abdullah, each
// numbered in the book's own sequence. They were being folded into the
// preceding hadith; the optional "* " makes each its own record. The star
// and its dash are left in the text (never removed).
// The number must NOT run straight into a letter: "# 278ه، ..." is a DATE
// opening a paragraph, and taking "278" as a hadith number split the word
// "278ه،" in two (Architect review, found by the independent word check).
// A space, "-", "،" (a combined hadith, "# 9936، 9937 - ...") or "/" (a
// sub-numbered one, "# 11073/ب - ...") may follow; that suffix stays in the
// text, so no character is lost.
const INLINE_NUMBER_RE = /^# (\* )?(\d+)(?=[\s\-،/]|$)\s?(.*)$/;
const CONTINUATION_RE = /^~~(.*)$/;
// Measured: most paragraph-opens are "# text", but a few source lines carry
// no space at all before the payload (e.g. Bukhari "#@QB@ ..."), and some are
// a bare "#" with nothing after it. Both are real paragraph content, not
// unclassified lines, so the space after "#" is optional here -- this is the
// generic fallback, checked only after the more specific "### ", "# | N " and
// "# N " patterns above have already had their turn.
const PARA_OPEN_RE = /^#(?!#)\s?(.*)$/;
// Muslim's own second paragraph-open marker -- see parseOpenitiBook's own
// comment at its call site.
const DOLLAR_OPEN_RE = /^### \$\s?(.*)$/;
// Riyad al-Salihin's own glued-number slip -- see parseOpenitiBook's own
// comment at its call site. Measured twice, in two slightly different
// shapes: "# 11/501-وعن ..." (no space, trailing dash) and
// "# 13/1892 وعن ..." (a space, no trailing dash) -- both handled by one
// regex rather than assuming either shape is the only one.
const GLUED_TRIPLE_PIPE_NUMBER_RE = /^# (\d+\/\d+-?)\s?(\S.*)$/;

/**
 * Riyad al-Salihin's "N/M-" -> M (the traditional number, always this
 * chapter's own running count N's larger sibling); Tirmidhi's plain "N" -> N.
 *
 * Measured on the real file: eight "### |||" lines carry a typo the clean
 * "N/M-" shape does not cover -- a doubled slash ("3//701-"), the two numbers
 * swapped ("416-5/"), trailing garbage ("1/975- 1 "), or the "N/" half
 * dropped entirely ("228- "). An anchored regex with a first-digit fallback
 * got three of these eight WRONG (grabbing N instead of M whenever a typo
 * broke the anchor). M is the whole book's running count and N is this
 * hadith's position within its own chapter, which resets every chapter and
 * is always far smaller -- so the larger of every digit run in the line is
 * M, whatever the surrounding typo. Checked against all eight measured typos
 * and against the ~1,890 clean lines alike.
 */
export function parseTriplePipeNumber(rest) {
  const digitRuns = rest.match(/\d+/g);
  if (!digitRuns) return null;
  return Math.max(...digitRuns.map(Number));
}

/**
 * Parses one OpenITI mARkdown book into an ordered list of hadith records.
 * `numberingStyle` is one of "inline-number" | "triple-pipe-number" | "sequential".
 *
 * Returns { hadiths, warnings }, where each hadith is
 * { number, chapterPath: string[], text, pageRefs: string[] }, in file order.
 * `number` is null for a sequential book's non-content paragraphs skipped --
 * it never is, in practice, but a defensive caller should not assume 1..N.
 *
 * TEXT BEFORE A CHAPTER'S FIRST HADITH IS NOT PART OF ANY HADITH'S OWN TEXT.
 * The issue's own proof for this splitter requires Bukhari's hadith 1 to
 * BEGIN with «حدثنا الحميدي» -- and between the very first heading and that
 * line sits the chapter's own introductory sentence ("قال الشيخ الإمام
 * الحافظ ..."), with the whole book's own opening title/basmala sitting
 * before even that, before any heading at all. Both are chapter/book-level
 * material, not hadith content -- prepending either to hadith 1 (an earlier
 * draft did exactly this, to avoid dropping any word) would satisfy "nothing
 * is dropped" at the cost of failing the one check the issue names by name.
 * CORRECTED (Architect review, 26 Sep 2026): this text used to be discarded,
 * which silently dropped thousands of paragraphs. It is now kept as its own
 * passage (`kind: "chapter-text"`, `number: null`) -- still never
 * prepended to hadith 1 -- and tools/i18n-verify/openiti-split.mjs checks
 * the output against the raw file INDEPENDENTLY of this parser.
 */
export function parseOpenitiBook(rawText, numberingStyle) {
  const lines = rawText.split(/\r?\n/);
  const hadiths = [];
  const warnings = [];

  let inMeta = true;
  const headingStack = [null, null, null]; // depth 1..3, 0-indexed
  let currentHadith = null; // { number, chapterPath, textParts, pageRefs }
  let seq = 0;
  // A heading's own text can wrap across "~~" continuation lines exactly
  // like a paragraph's (measured: Bukhari kitab 58's own heading wraps this
  // way, e.g. "( 58 ... يوزن ~~ وقال مجاهد ... العادل )"). While one is open,
  // a "~~" line extends IT, not whatever hadith was open before the heading
  // started -- closeOpenHeading() finalizes it into headingStack the moment
  // any other line type appears.
  let openHeading = null; // { depth, parts: string[] }
  const pendingRefs = []; // page refs seen while nothing is open

  function activeChapterPath() {
    return headingStack.filter((h) => h != null);
  }

  /**
   * Architect review (26 Sep 2026): text with no hadith open used to be
   * DISCARDED here -- measured, that dropped 9,090 Muwatta' paragraphs
   * (Malik's own rulings among them), 712 in Bukhari (its chapter notes with
   * their Qur'an verses), 1,224 in Musnad Ahmad and every book's
   * introduction, while the round-trip check passed because it compared the
   * output with this same parser. Such text is now KEPT as its own passage,
   * never prepended to a hadith (so Bukhari's hadith 1 still begins
   * «حدثنا الحميدي»): `number: null`, `kind: "chapter-text"`, or
   * `kind: "editorial"` inside the Muwatta' editor's section below.
   */
  function append(raw) {
    if (!currentHadith) {
      if (!stripMarkers(raw)) {
        pendingRefs.push(...extractPageRefs(raw));
        return;
      }
      currentHadith = { number: null, kind: suppressHadithStart ? "editorial" : "chapter-text", chapterPath: activeChapterPath(), textParts: [], pageRefs: pendingRefs.splice(0) };
    }
    const stripped = stripMarkers(raw);
    const refs = extractPageRefs(raw);
    if (stripped) currentHadith.textParts.push(stripped);
    if (refs.length) currentHadith.pageRefs.push(...refs);
  }

  function finalizeHadith(h) {
    return {
      number: h.number,
      kind: h.kind ?? "hadith",
      chapterPath: h.chapterPath,
      text: h.textParts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      pageRefs: h.pageRefs,
    };
  }

  function flush() {
    if (currentHadith) {
      hadiths.push(finalizeHadith(currentHadith));
      currentHadith = null;
    }
  }

  // Measured once, in Muwatta only: a top-level heading literally titled
  // "EDITOR" (line 40, "### |EDITOR|", in the transcriber's own Latin
  // script) opens ~10,000 lines of editorial front matter -- biographical
  // notes on narrators, in several numbered lists that each restart at 1 --
  // before the real book (its own first depth-1 heading at line 10183)
  // begins. Structurally identical to hadith paragraphs ("# 1 - ...", "# 2 -
  // ...") and would otherwise be split into ~50 spurious "hadith" carrying
  // biography text, not narrations, with a number sequence that keeps
  // resetting to 1. Suppressed for exactly the span between this heading and
  // the NEXT depth-1 heading, by content, not by a hardcoded line range.
  let suppressHadithStart = false;

  function startHadith(number) {
    flush();
    if (suppressHadithStart) {
      // The Muwatta' editor's numbered lists are not narrations: kept as
      // editorial passages, never as numbered hadith.
      currentHadith = { number: null, kind: "editorial", chapterPath: activeChapterPath(), textParts: [], pageRefs: pendingRefs.splice(0) };
      return;
    }
    currentHadith = { number, chapterPath: activeChapterPath(), textParts: [], pageRefs: pendingRefs.splice(0) };
  }

  function closeOpenHeading() {
    if (!openHeading) return;
    const joined = openHeading.parts.filter(Boolean).join(" ");
    const cleaned = stripMarkers(unwrapParens(joined));
    const depth = openHeading.depth;
    if (depth === 1) suppressHadithStart = cleaned.replace(/\|/g, "").trim().toLowerCase() === "editor";
    headingStack[depth - 1] = cleaned;
    for (let d = depth; d < 3; d++) headingStack[d] = null;
    openHeading = null;
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (inMeta) {
      if (line.trim() === META_END) inMeta = false;
      continue;
    }
    if (!line.trim()) continue;

    const contMatchEarly = line.match(CONTINUATION_RE);
    if (contMatchEarly && openHeading) {
      openHeading.parts.push(contMatchEarly[1] ?? "");
      continue;
    }

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      if (depth === 3 && numberingStyle === "triple-pipe-number") {
        closeOpenHeading();
        const n = parseTriplePipeNumber(headingMatch[2] ?? "");
        if (n == null) warnings.push(`unparsed triple-pipe number: "${line}"`);
        else startHadith(n);
        continue;
      }
      closeOpenHeading();
      flush();
      openHeading = { depth, parts: [headingMatch[2] ?? ""] };
      continue;
    }

    const flatHeadingMatch = line.match(FLAT_HEADING_RE);
    if (flatHeadingMatch) {
      closeOpenHeading();
      flush();
      openHeading = { depth: 1, parts: [flatHeadingMatch[2] ?? ""] };
      continue;
    }

    if (numberingStyle === "inline-number") {
      const numMatch = line.match(INLINE_NUMBER_RE);
      if (numMatch) {
        // Measured six times in Bukhari (never elsewhere): a bab heading
        // written as a bare "# 39 باب ..." paragraph instead of its usual
        // "### || ( 39 باب ... )" form -- indistinguishable from a real
        // hadith-start by shape alone (both are "# <digits> ..."), but a
        // hadith's own text never opens with "باب" ("chapter" -- every real
        // hadith opens with a narrator chain, حدثنا/أخبرنا/... or the odd
        // Qur'an/commentary aside, never this word). Caught by content, not
        // by hardcoding these headings' own numbers or text. Checked against
        // the MARKER-STRIPPED text -- one of the six has its own inline
        // milestone marker sitting between the number and "باب" ("# 372
        // ms1348 باب ..."), which a plain startsWith would miss.
        if (/^باب(?:\s|$)/.test(stripMarkers(numMatch[3] ?? ""))) {
          closeOpenHeading();
          flush();
          openHeading = { depth: 2, parts: [line.replace(/^# /, "")] };
          continue;
        }
        closeOpenHeading();
        startHadith(Number(numMatch[2]));
        append(`${numMatch[1] ? "* " : ""}${numMatch[3] ?? ""}`);
        continue;
      }
    }

    if (numberingStyle === "triple-pipe-number") {
      // Measured once in Riyad al-Salihin (hadith 11/501): its own
      // "### ||| 11/501-" marker line is simply missing from this source
      // file, with the number glued straight onto the following paragraph
      // instead ("# 11/501-وعن ..."). Without this, that hadith's whole text
      // silently merges into the PRECEDING one (500) rather than becoming
      // its own record. Recognised generically, not hardcoded to this one
      // hadith, so any other occurrence of the same slip is caught too.
      const gluedMatch = line.match(GLUED_TRIPLE_PIPE_NUMBER_RE);
      if (gluedMatch) {
        closeOpenHeading();
        startHadith(parseTriplePipeNumber(gluedMatch[1]));
        append(gluedMatch[2] ?? "");
        continue;
      }
    }

    // A second, DIFFERENTLY-MARKED paragraph-open, found only in Muslim
    // (6,463 occurrences; measured absent from all 10 other books): "### $"
    // opens a fresh isnad/matn the same way "# " does elsewhere in the same
    // file (e.g. citing a second chain for the chapter's theme). Muslim
    // carries no number marker at all, so under "sequential" numbering this
    // is exactly one more paragraph-open, handled identically to "# ".
    const dollarMatch = line.match(DOLLAR_OPEN_RE);
    const paraMatch = dollarMatch ?? line.match(PARA_OPEN_RE);
    if (paraMatch) {
      closeOpenHeading();
      if (numberingStyle === "sequential") {
        const stripped = stripMarkers(paraMatch[1] ?? "");
        if (stripped) {
          seq += 1;
          startHadith(seq);
          append(paraMatch[1] ?? "");
        } else {
          // A bare page/milestone marker paragraph -- keep the reference,
          // start nothing (see the module header comment).
          append(paraMatch[1] ?? "");
        }
        continue;
      }
      append(paraMatch[1] ?? "");
      continue;
    }

    const contMatch = line.match(CONTINUATION_RE);
    if (contMatch) {
      append(contMatch[1] ?? "");
      continue;
    }

    // Measured on Muwatta (229 occurrences): a bare page/milestone marker can
    // stand on its own line with no "#"/"~~" prefix at all -- a genuine source
    // quirk, not a gap in this parser. Safe only because stripMarkers()
    // leaves nothing: any line that still carries a real word after stripping
    // still falls through to the warning below, unclassified.
    if (!stripMarkers(line)) {
      append(line);
      continue;
    }

    // Measured once, in Muslim: a line missing its own "~~" continuation
    // prefix (a transcription slip -- the line right before it is itself a
    // bare, unprefixed page marker, so this looks like the source dropped
    // two prefixes in a row at that exact spot). It still carries real
    // words, so it is folded into whatever is currently open exactly like a
    // proper "~~" line would be -- recorded as a warning rather than
    // silently treated as normal, since a line missing its marker THIS way
    // is not expected, but its words are not dropped either way.
    warnings.push(`line missing its "~~"/"#" marker, folded in as a continuation: "${line.slice(0, 80)}"`);
    append(line);
  }

  closeOpenHeading();
  flush();

  return { hadiths, warnings };
}

/**
 * The word-sequence the verify suite's round-trip check compares the WRITTEN
 * split output against -- every word parseOpenitiBook placed into some
 * hadith's `text`, in file order, independent of hadith boundaries.
 *
 * Deliberately a thin wrapper around parseOpenitiBook rather than a second,
 * parallel line-classifier: re-implementing the same state machine twice is
 * exactly how three of this module's own bugs during development (a wrapped
 * heading, Muslim's "### $", Riyad al-Salihin's glued numbers) went
 * undetected in ONE side while "passing" on the other, each one only found
 * by the two disagreeing. What the verify suite actually needs to catch is
 * not "did this function parse the mARkdown correctly" (proven separately,
 * against all 11 books, before this was wired into the splitter) but "does
 * the split output ON DISK match a fresh parse of the untouched source" --
 * i.e. did openiti-split.mjs write what it computed, correctly and
 * completely, chapter by chapter and shard by shard. Comparing against a
 * SECOND independent parser would not strengthen that; it would only risk
 * the two parsers disagreeing about the mARkdown itself, which is a
 * different question already answered.
 */
export function bodyWords(rawText, numberingStyle) {
  const { hadiths } = parseOpenitiBook(rawText, numberingStyle);
  return hadiths.flatMap((h) => h.text.split(" ").filter(Boolean));
}
