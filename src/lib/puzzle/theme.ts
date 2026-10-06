export const PT = {
  bg: "#FAF8F5",
  surface: "#FFFFFF",
  ink: "#5A3A3A",
  muted: "#9C7D78",
  line: "#EFE5DC",
  guide: "#E2CCC2",
  accent: "#BE5560",
  accentSoft: "#F0B7A8",
  chip: "#F8EEE6",
  gold: "#E3A857",
} as const;

/** Player colours: butter, rose and friends, all readable with white initials. */
export const PLAYER_COLORS = ["#BE5560", "#E3A857", "#8A9A6B", "#6E8FB5", "#B07AA1", "#D98A5F"];

export function playerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
