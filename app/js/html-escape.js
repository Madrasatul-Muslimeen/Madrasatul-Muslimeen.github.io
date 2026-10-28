// Shared HTML escaper (audit part 111). No side effects, no imports.
// Use it wherever a name or typed text is placed into an innerHTML template.
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}
