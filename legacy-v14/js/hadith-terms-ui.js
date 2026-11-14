/**
 * The card side of the translation-terms fold (docs/governance/hadith-translation-terms-rule.md): folds the English text of one
 * HadeethEnc card and offers an "As sourced" ON/OFF switch (J109) that shows the source's own words. Folded is the default.
 * Only English is folded; Arabic and Bangla are untouched. The switch appears only when the fold changed something on the card.
 */
import { t } from "./i18n.js";
import { el } from "./hadith-shared-ui.js";
import { foldTerms } from "./hadith-terms.js";

export function termsFolder(record, lang) {
  const arabic = [record.hadeeth_ar, record.explanation_ar, ...(Array.isArray(record.hints_ar) ? record.hints_ar : []), record.title_ar].filter(Boolean).join(" ");
  const active = lang === "en";
  const items = []; let changed = 0; let asSourced = false;
  return {
    /** Writes the folded text into `node` (or the sourced text while the switch is on) and remembers both. */
    set(node, original) {
      const text = String(original ?? "");
      const r = active ? foldTerms(text, arabic) : { text, did: { rabb: 0, allah: 0, rasulullah: 0 } };
      changed += r.did.rabb + r.did.allah + r.did.rasulullah;
      items.push([node, text, r.text]);
      node.textContent = asSourced ? text : r.text;
    },
    /** The switch, or null when nothing on this card was changed. */
    switchEl() {
      if (!changed) return null;
      const b = el("button", "hadith-terms-switch"); b.type = "button"; b.setAttribute("aria-expanded", "false"); b.dataset.hadithTermsSwitch = "true";
      b.innerHTML = '<span class="mm-sw" aria-hidden="true"></span> ';
      b.append(t("As sourced"));
      b.addEventListener("click", () => {
        asSourced = !asSourced; b.setAttribute("aria-expanded", String(asSourced)); // the shared ON/OFF switch (shell.css) reads this
        for (const [node, sourced, folded] of items) node.textContent = asSourced ? sourced : folded;
      });
      return b;
    },
  };
}
