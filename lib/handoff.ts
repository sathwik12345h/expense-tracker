// Small things one page leaves for the next, kept in sessionStorage (this tab only).

/** The name typed on the landing page's member card, waiting for the sign-up form. */
export const NAME_KEY = "spendwise-name"

/** Read a handed-off value; empty when there is none or storage is unavailable. */
export function readHandoff(key: string) {
  try {
    return sessionStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}
