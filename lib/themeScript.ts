// Shared by the server layout (which inlines the script) and the client theme store.

export const THEME_KEY = "spendwise-theme"

/**
 * Runs before first paint so the page never flashes the wrong theme:
 * a saved choice wins, otherwise the system setting.
 */
export const THEME_SCRIPT = `(function(){var t;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t})()`
