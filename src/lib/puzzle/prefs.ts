/** Per-viewer settings. They live in this browser only, so everyone can set the room up the way they like. */
export interface ViewPrefs {
  guide: boolean;
  cursors: boolean;
  names: boolean;
  autoSnap: boolean;
}

export const DEFAULT_PREFS: ViewPrefs = { guide: true, cursors: true, names: true, autoSnap: true };

const KEY = "puzzle:prefs";

export function loadPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<ViewPrefs>;
    return {
      guide: typeof p.guide === "boolean" ? p.guide : DEFAULT_PREFS.guide,
      cursors: typeof p.cursors === "boolean" ? p.cursors : DEFAULT_PREFS.cursors,
      names: typeof p.names === "boolean" ? p.names : DEFAULT_PREFS.names,
      autoSnap: typeof p.autoSnap === "boolean" ? p.autoSnap : DEFAULT_PREFS.autoSnap,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: ViewPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage can be unavailable */
  }
}