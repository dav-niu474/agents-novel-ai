/**
 * Time helpers. Always use UTC ISO-8601 with 'Z' suffix to match
 * docs/design/01-asset-model.md §2.3 examples.
 */

/** Current UTC time as ISO-8601 string, e.g. "2026-05-24T15:30:00.000Z". */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Parse an ISO-8601 timestamp into a Date. Throws on invalid input. */
export function parseISO(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`invalid ISO timestamp: ${s}`);
  }
  return d;
}
