// KST is a fixed offset (UTC+9, no DST), so we can map a calendar day to a
// UTC instant range without a full timezone library.
const KST_OFFSET = "+09:00";

/** Start of the given KST calendar day (YYYY-MM-DD) as a UTC Date. */
export function kstDayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000${KST_OFFSET}`);
}

/** Exclusive end of the given KST calendar day (start of the next day) as a UTC Date. */
export function kstDayEnd(date: string): Date {
  const start = kstDayStart(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
