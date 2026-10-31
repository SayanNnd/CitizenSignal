export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 1–5 bars for the signal-strength priority meter. */
export function priorityLevel(priority: number): number {
  return Math.max(1, Math.min(5, Math.ceil(priority / 10)));
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/** Plain-language note for an issue that came back after being fixed; null if it never has. */
export function recurrenceLabel(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? 'Came back after being fixed' : `Came back ${count} times after being fixed`;
}

export type Severity = 'low' | 'medium' | 'high';

/** Same priority scale as the old meter: levels 1–2 low, 3 medium, 4–5 high. */
export function severityOf(priority: number): Severity {
  const level = priorityLevel(priority);
  return level >= 4 ? 'high' : level === 3 ? 'medium' : 'low';
}

/**
 * The API's title is "<Category>: <first words of the description>". The category is shown
 * separately, so drop that prefix and use the rest as the headline.
 */
export function displayTitle(title: string, categoryLabel: string): string {
  const prefix = `${categoryLabel}:`;
  const rest = title.startsWith(prefix) ? title.slice(prefix.length).trim() : title.trim();
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : categoryLabel;
}
