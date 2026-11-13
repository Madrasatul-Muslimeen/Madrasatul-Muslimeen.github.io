// PCF MSA J104 item 25 (13 Nov 2026): the Dua Card's Menu has five tabs (Show, Share, Keep, Listen, Study) and only the
// chosen tab's buttons are on screen, so a suite that presses a control must first open ITS tab, like a reader does. This is
// the lesson "when a control moves inside a menu, every direct page.click times out and the element still RESOLVES".
// reveal() clicks the tab of the group that holds `selector`, only when that group is switched off; it never changes
// what the app does and does nothing when the page has no tabs or the control is already on screen.
export async function reveal(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const g = el?.closest("[data-tab-off]");
    if (!g) return;
    const key = g.matches(".dua-sel") ? "show" : g.dataset.duaMenuGroup;
    g.parentElement.querySelector(`:scope > .dua-menu-tabs [data-dua-tab="${key}"]`)?.click();
  }, selector).catch(() => {});
}
export async function tabClick(page, selector, opts) { await reveal(page, selector); return page.click(selector, opts); }
/** For a suite that MEASURES every chip of the Menu at once (size, position): switches every tab's group on together. The
 *  tab behaviour itself is proved by dua-menu-tabs-browser.mjs; these suites only ask whether each chip is finger-sized. */
export async function allTabsOn(page) {
  await page.evaluate(() => document.querySelectorAll("[data-tab-off]").forEach((g) => g.removeAttribute("data-tab-off")));
}
