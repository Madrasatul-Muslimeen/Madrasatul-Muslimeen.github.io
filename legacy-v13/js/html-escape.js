// Shared HTML escaper (audit part 111) and link-safety helper (audit part 112).
// No side effects, no imports.
// Use escapeHtml wherever a name or typed text is placed into an innerHTML template.
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}

// Returns the url unchanged when it is an http:, https: or mailto: link, or a
// relative path with no scheme; otherwise "". Browsers ignore leading control
// characters and whitespace, and tabs/newlines inside the scheme, so strip them
// before looking at the scheme.
export function safeHref(url) {
  const raw = String(url ?? "");
  const probe = raw.replace(/[\u0000- \u007f-\u009f​-‍﻿]/g, "");
  if (!probe) return "";
  const m = /^([a-z][a-z0-9+.\-]*):/i.exec(probe);
  if (m) return /^(https?|mailto)$/i.test(m[1]) ? raw : "";
  // A colon before any "/", "?" or "#" would be a scheme; none was found, so it is relative.
  return raw;
}
