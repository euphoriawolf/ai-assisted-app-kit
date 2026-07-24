// Some D1 timestamps are written by SQL `datetime('now')`, which yields "YYYY-MM-DD HH:MM:SS" —
// UTC, but with no `T` and no zone marker. `new Date()` parses that space form as LOCAL time, so
// viewers east/west of UTC see a wrong "created X ago". Normalize: if the string has no timezone,
// treat it as UTC by inserting `T` and appending `Z`. Always parse stored timestamps through this.
export function parseTimestamp(s: string | null | undefined): Date | null {
  if (!s) return null;
  const hasTz = /[zZ]$|[+-]\d\d:?\d\d$/.test(s.trim());
  const iso = hasTz ? s.trim() : s.trim().replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
