/**
 * Format an amount as SAR currency.
 * When fractionDigits is omitted: shows up to 2 decimal places but
 * suppresses trailing zeros (5 → "SAR 5", 5.5 → "SAR 5.5").
 * Pass an explicit value to fix the digit count (e.g. 2 for totals).
 */
export function formatCurrency(amount: number, fractionDigits?: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  }).format(amount);
}

/** e.g. "21 Apr 2026" */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** e.g. "14:35" */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
