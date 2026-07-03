const ID_KEY = "doodle:playerId";
const NAME_KEY = "doodle:playerName";

export const AVATAR_COLORS = [
  "#F0997B", // coral
  "#85B7EB", // blue
  "#97C459", // green
  "#EC93B1", // pink
  "#FAC775", // amber
  "#AFA9EC", // purple
];

export function getLocalPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NAME_KEY, name);
}

export function colorForIndex(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
