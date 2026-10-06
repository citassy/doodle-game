/** "Under a minute", "12 min", "1 h 05 min". Meant for a tooltip, so whole minutes are plenty. */
export function formatStay(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  if (m < 1) return "Under a minute";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h} h ${String(mm).padStart(2, "0")} min` : `${h} h`;
}