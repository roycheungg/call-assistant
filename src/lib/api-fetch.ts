/**
 * Wrapper around fetch() that auto-propagates the ?asOrg query param
 * so that super-admins viewing a different org (via the sidebar switcher)
 * scope every dashboard API call to that org instead of their own.
 *
 * Only modifies internal same-origin "/api/..." paths in the browser. SSR,
 * external URLs, and non-/api paths pass through unchanged.
 */
export function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  if (typeof window === "undefined" || !input.startsWith("/api/")) {
    return fetch(input, init);
  }

  const asOrg = new URLSearchParams(window.location.search).get("asOrg");
  if (!asOrg) return fetch(input, init);

  // Don't double-append if the caller already set it
  if (/[?&]asOrg=/.test(input)) return fetch(input, init);

  const sep = input.includes("?") ? "&" : "?";
  return fetch(`${input}${sep}asOrg=${encodeURIComponent(asOrg)}`, init);
}
