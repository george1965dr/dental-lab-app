// Parses a plain "YYYY-MM-DD" date (as stored for due_date/start_date/created_date --
// no time component) into a local-midnight Date, instead of `new Date("YYYY-MM-DD")`'s
// UTC-midnight interpretation. Formatting a UTC-midnight instant with a local-timezone
// method like toLocaleDateString() rolls it back a calendar day in any timezone behind
// UTC (all of the US), which is why the Case Detail view's due date showed one day
// earlier than what the Kanban card (which reads the string's own y/m/d directly)
// displayed for the same case.
function parseDateOnly(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString)
  if (!match) return new Date(dateString)
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function formatLocalDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return parseDateOnly(dateString).toLocaleDateString("en-US", options)
}
