import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Purchase } from '@/data/models';
import { purchaseRepository } from '@/data/repositories';
import {
  computeAnalytics,
  computeMonthlyTrend,
  filterPurchasesByRange,
  type AnalyticsSummary,
  type TimeRange,
} from '@/application/analytics';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatCurrency } from '@/shared/utils/formatting';

/**
 * AnalyticsPage — renders the Class-Diagram analytics metrics for the
 * current user.
 *
 * Layout:
 *   - Total spending stat card with a Today / Month / Year / All-time
 *     range toggle that filters which purchases feed the total. The
 *     rest of the page stays on the all-time dataset so the category
 *     breakdown and trend don't flicker as the user switches horizons.
 *   - Spending-by-category as a recharts donut pie.
 *   - Monthly trend as a recharts bar chart over the last six months.
 *   - Warranty coverage as a single colored bar (no duplicate stat
 *     card — the bar is the canonical view).
 */
const PIE_COLORS = [
  '#a80000',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#64748b',
];

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  month: 'This month',
  year: 'This year',
  all: 'All time',
};

export default function AnalyticsPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('month');

  useEffect(() => {
    let cancelled = false;
    void purchaseRepository
      .getByUserId(getCurrentUserId())
      .then((items) => {
        if (!cancelled) setPurchases(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load analytics.');
        setPurchases([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo<AnalyticsSummary | null>(
    () => (purchases ? computeAnalytics(purchases) : null),
    [purchases]
  );

  const categoryRows = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.spendingByCategory)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [summary]);

  const trend = useMemo(
    () => (purchases ? computeMonthlyTrend(purchases, 6) : []),
    [purchases]
  );

  const rangedTotal = useMemo(() => {
    if (!purchases) return { total: 0, count: 0 };
    const filtered = filterPurchasesByRange(purchases, range);
    const total = filtered.reduce((sum, p) => sum + p.price, 0);
    return { total, count: filtered.length };
  }, [purchases, range]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Spending analytics
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Totals, category breakdown, monthly trend, and warranty coverage.
        </p>
      </header>

      {loadError ? (
        <p className="mb-6 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      {summary === null ? (
        <AnalyticsSkeleton />
      ) : summary.purchaseCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TotalSpendingCard
              total={rangedTotal.total}
              count={rangedTotal.count}
              range={range}
              onRangeChange={setRange}
            />
            <StatCard
              label="Categories"
              value={String(categoryRows.length)}
              sublabel="Distinct categories logged"
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Spending by category
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Share of {formatCurrency(summary.totalSpending, 2)} lifetime spend
              </p>
              <CategoryPie rows={categoryRows} />
            </div>

            <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Last 6 months
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Monthly spend including the current month
              </p>
              <MonthlyTrendChart
                points={trend.map((p) => ({ ...p }))}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">Warranty coverage</h2>
            <CoverageBar fraction={summary.warrantyCoverage} />
            <p className="mt-2 text-xs text-slate-500">
              Purchases with a recorded warranty end date count as covered.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function TotalSpendingCard({
  total,
  count,
  range,
  onRangeChange,
}: {
  total: number;
  count: number;
  range: TimeRange;
  onRangeChange: (next: TimeRange) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Total spending
        </p>
        <select
          value={range}
          onChange={(event) => onRangeChange(event.target.value as TimeRange)}
          aria-label="Total spending time range"
          className="rounded-md border border-slate-700 bg-surface px-2 py-1 text-xs font-medium text-slate-200 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          {(['today', 'month', 'year', 'all'] as TimeRange[]).map((option) => (
            <option key={option} value={option}>
              {TIME_RANGE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-100">
        {formatCurrency(total, 2)}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {count} purchase{count === 1 ? '' : 's'} · {TIME_RANGE_LABELS[range].toLowerCase()}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
    </div>
  );
}

interface CategoryRow {
  name: string;
  total: number;
}

function CategoryPie({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-slate-400">No category data yet.</p>;
  }
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={1}
            stroke="#1a1a1e"
          >
            {rows.map((row, index) => (
              <Cell key={row.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#f1f5f9' }}
            formatter={(value) => [formatCurrency(Number(value), 2), 'Total']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyTrendChart({
  points,
}: {
  points: Array<{ month: string; label: string; total: number }>;
}) {
  return (
    <div className="mt-4 h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#2f2f36" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#2f2f36' }}
            tickLine={{ stroke: '#2f2f36' }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#2f2f36' }}
            tickLine={{ stroke: '#2f2f36' }}
            tickFormatter={(value: number) => (value >= 1000 ? `${value / 1000}k` : String(value))}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: '#f1f5f9' }}
            cursor={{ fill: 'rgba(139, 0, 0, 0.1)' }}
            formatter={(value) => [formatCurrency(Number(value), 2), 'Total']}
          />
          <Bar dataKey="total" fill="#a80000" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1a1a1e',
  border: '1px solid #2f2f36',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 12,
};

function CoverageBar({ fraction }: { fraction: number }) {
  const percent = Math.round(fraction * 100);
  const color =
    percent >= 66
      ? 'bg-emerald-500'
      : percent >= 33
        ? 'bg-amber-500'
        : 'bg-rose-500';
  return (
    <>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-3xl font-semibold text-slate-100">{percent}%</span>
        <span className="text-xs text-slate-500">of purchases covered</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label="Warranty coverage"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated" />
        <div className="h-80 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated" />
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-100">Nothing to analyse yet</h2>
      <p className="mt-1 text-sm text-slate-400">
        Log a purchase or two and your spending breakdown will appear here.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/purchases/new"
          className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          Add a purchase
        </Link>
        <Link
          to="/purchases/new/quick"
          className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
        >
          Quick add
        </Link>
      </div>
    </div>
  );
}
