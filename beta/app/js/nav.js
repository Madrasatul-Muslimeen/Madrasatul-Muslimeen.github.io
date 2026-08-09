// Shell round 1 (option A, agreed with the owner 8 Aug 2026) — a small
// shared nav strip connecting the separate phase-built pages, since none of
// them link to each other today.
//
// I2: a renderer, not a module -- takes roles in, HTML out. Never touches
// Firebase, never computes roles itself; the caller already knows them from
// its own sign-in bootstrap.

const LINKS = [
  { href: "quranrevival.html", label: "Study" },
  { href: "records.html", label: "Records" },
  { href: "people.html", label: "People", ownerPrimeOnly: true },
  { href: "catalogue.html", label: "Catalogue", ownerPrimeOnly: true },
];

/** roles: this person's roles in the currently-active tenant (e.g. ["owner","prime"]). People/Catalogue only show for owner/prime -- everyone else just gets Study + Records. */
export function renderNavBar(roles = []) {
  const canAdmin = roles.includes("owner") || roles.includes("prime");
  const currentFile = location.pathname.split("/").pop();
  const items = LINKS.filter((l) => !l.ownerPrimeOnly || canAdmin)
    .map((l) => {
      const isCurrent = l.href === currentFile;
      return `<a href="${l.href}" class="nav-link${isCurrent ? " nav-current" : ""}"${isCurrent ? ' aria-current="page"' : ""}>${l.label}</a>`;
    })
    .join("");
  return `<nav class="app-nav">${items}</nav>`;
}
