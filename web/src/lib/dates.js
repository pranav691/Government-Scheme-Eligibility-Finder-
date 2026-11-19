// Accepts only a real YYYY-MM-DD calendar date; anything else (blank,
// whitespace, other formats) becomes null so PostgreSQL never sees it.
export function cleanDate(value) {
  if (typeof value !== "string") return null;

  const v = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;

  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v
    ? null
    : v;
}
