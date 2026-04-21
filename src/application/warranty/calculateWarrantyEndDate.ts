/**
 * Parse a human duration like "1 year", "6 months", "14 days", "2 weeks"
 * into a concrete end date, measured from `purchaseDate`. Returns null for
 * empty/invalid input so the caller can treat "no warranty" uniformly.
 *
 * Step 16 of the sequence diagram ("calculateWarrantyEndDate()").
 */
export function calculateWarrantyEndDate(
  purchaseDate: Date,
  duration: string | undefined | null
): Date | null {
  if (!duration) return null;

  const match = duration
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(day|week|month|year)s?$/);
  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2] as 'day' | 'week' | 'month' | 'year';
  const end = new Date(purchaseDate);

  switch (unit) {
    case 'day':
      end.setDate(end.getDate() + amount);
      break;
    case 'week':
      end.setDate(end.getDate() + amount * 7);
      break;
    case 'month':
      end.setMonth(end.getMonth() + amount);
      break;
    case 'year':
      end.setFullYear(end.getFullYear() + amount);
      break;
  }
  return end;
}
