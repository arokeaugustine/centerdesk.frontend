/**
 * Date handling shared by the reporting screens (dashboard and reports).
 *
 * Two separate problems live here, and both have bitten this app:
 *
 * 1. `<input type="date">` speaks local calendar days ("2026-10-05"), while the API compares
 *    against timestamptz columns. A bare date binds server-side to that day's MIDNIGHT, so
 *    sending "to = today" silently excludes everything that happened today — which reads as a
 *    dashboard full of zeroes rather than as an error.
 * 2. The server reads a bare date as UTC, so "today" would mean UTC's today, not the viewer's.
 *
 * Sending the local day's true start and end as UTC instants solves both at once.
 */

/** Local-calendar "yyyy-MM-dd". Not toISOString(), which shifts the date for anyone behind UTC. */
export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Today in local-calendar "yyyy-MM-dd" — the usual `max` for a date input. */
export function isoToday(): string {
  return isoDaysAgo(0);
}

/**
 * Turns a local calendar day into the UTC instant that bounds it, so the window the server
 * counts over is exactly the day the viewer picked.
 *
 * `Z`-suffixed on purpose: an offset like "+01:00" survives neither Angular's HttpParams
 * encoding (which leaves `+` alone, and the server then decodes it as a space) nor the query
 * binder on the other side.
 */
export function localDayBounds(date: string, edge: 'start' | 'end'): string {
  const [year, month, day] = date.split('-').map(Number);

  return edge === 'start'
    ? new Date(year, month - 1, day, 0, 0, 0, 0).toISOString()
    : new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}
