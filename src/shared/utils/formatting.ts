/**
 * Format an amount as SAR currency. Defaults to no fraction digits so
 * everyday prices like "4999 SAR" render cleanly; callers can override.
 */
export function formatCurrency(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
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
