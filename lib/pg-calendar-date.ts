/**
 * Calendar day from Postgres DATE (or driver JSON).
 * Avoid `Date.prototype.toISOString().slice(0, 10)` — it uses UTC and shifts the local calendar day.
 */
export function calendarDayFromPg(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return m ? m[1] : value.slice(0, 10);
  }
  const y = value.getFullYear();
  const mo = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}
