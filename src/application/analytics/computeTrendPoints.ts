import type { Purchase } from '@/data/models';

export type TrendGranularity = 'hour' | 'day' | 'month';

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

/**
 * Bucket a set of (already-filtered) purchases into chart data points.
 *
 *   hour  — 24 buckets, one per hour of the day.
 *   day   — one bucket per calendar day between start and end.
 *   month — one bucket per calendar month between start and end.
 *
 * All buckets are pre-seeded to 0 so the chart never has gaps.
 */
export function computeTrendPoints(
  purchases: readonly Purchase[],
  granularity: TrendGranularity,
  start: Date,
  end: Date
): TrendPoint[] {
  switch (granularity) {
    case 'hour': {
      const points: TrendPoint[] = Array.from({ length: 24 }, (_, h) => ({
        key: String(h),
        label:
          h === 0 ? '12 AM'
          : h < 12 ? `${h} AM`
          : h === 12 ? '12 PM'
          : `${h - 12} PM`,
        total: 0,
      }));
      for (const p of purchases) {
        points[p.purchaseDate.getHours()].total += p.price;
      }
      return points;
    }

    case 'day': {
      const points: TrendPoint[] = [];
      const idx: Record<string, number> = {};
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= last) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
        idx[key] = points.length;
        points.push({
          key,
          label: cursor.toLocaleString('en-GB', { day: 'numeric', month: 'short' }),
          total: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      for (const p of purchases) {
        const d = p.purchaseDate;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const i = idx[key];
        if (i !== undefined) points[i].total += p.price;
      }
      return points;
    }

    case 'month': {
      const points: TrendPoint[] = [];
      const idx: Record<string, number> = {};
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const last = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= last) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        idx[key] = points.length;
        points.push({
          key,
          label: cursor.toLocaleString('en-GB', { month: 'short', year: 'numeric' }),
          total: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      for (const p of purchases) {
        const d = p.purchaseDate;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const i = idx[key];
        if (i !== undefined) points[i].total += p.price;
      }
      return points;
    }
  }
}
