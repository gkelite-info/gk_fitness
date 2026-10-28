export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes any date string or Date object into a local Date object set strictly
 * to midnight (00:00:00.000), ignoring any time-of-day information.
 */
export function parseLocalDate(dateInput?: string | Date | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match && !trimmed.includes('T')) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
    }
  }
  return new Date();
}

/**
 * Calculates remaining calendar days strictly by date boundaries (midnight-to-midnight).
 * Does NOT decrement during the day based on hours/minutes passed.
 * Decrements only when the calendar date changes at local midnight (00:00:00).
 */
export function getCalendarDaysDifference(
  endDateInput?: string | Date | null,
  fromDateInput?: string | Date | null
): number {
  if (!endDateInput) return 0;
  const end = parseLocalDate(endDateInput);
  const start = parseLocalDate(fromDateInput || new Date());
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Parses duration representation (number, "1 Month", "1 Year", "3 Months") into an integer count of months.
 */
export function parseDurationMonths(duration: any): number {
  if (!duration) return 1;
  const str = String(duration).toLowerCase().trim();
  if (str.includes('year')) {
    const m = str.match(/\d+/);
    return m ? parseInt(m[0], 10) * 12 : 12;
  }
  const m = str.match(/\d+/);
  return m ? parseInt(m[0], 10) : 1;
}

/**
 * Calculates the exact plan expiry date from a given start date by adding the specified duration in months.
 * For example:
 * - Start '2026-10-27' + 1 month => '2026-11-27'
 * - Handles end of month properly (e.g. Jan 31 + 1 month => Feb 28).
 */
export function calculatePlanExpiryDate(
  startDateInput?: string | Date | null,
  durationMonthsInput: any = 1
): string {
  const start = parseLocalDate(startDateInput || new Date());
  const months = parseDurationMonths(durationMonthsInput);
  const end = new Date(start);
  const targetDay = start.getDate();
  end.setMonth(end.getMonth() + months);
  if (end.getDate() !== targetDay) {
    end.setDate(0);
  }
  return getLocalDateString(end);
}
