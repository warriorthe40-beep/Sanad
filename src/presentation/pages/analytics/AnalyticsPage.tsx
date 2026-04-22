import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Purchase } from '@/data/models';
import { purchaseRepository } from '@/data/repositories';
import { computeAnalytics, type AnalyticsSummary } from '@/application/analytics';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatCurrency } from '@/shared/utils/formatting';

/**
 * AnalyticsPage — renders the three Class-Diagram metrics for the current
 * user: Total Spending, Spending by Category, and Warranty Coverage.
 *
 * Data is fetched from `purchaseRepository` and reduced with
 * `computeAnalytics`. Category breakdown uses simple flexbox bars so we
 * have a clear visual without pulling in a chart dependency.
 */
export default function AnalyticsPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Spending analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Totals, category breakdown, and warranty coverage across your purchases.
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
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total spending"
              value={formatCurrency(summary.totalSpending, 2)}
              sublabel={`${summary.purchaseCount} purchase${summary.purchaseCount === 1 ? '' : 's'}`}
            />
            <StatCard
              label="Warranty coverage"
              value={`${Math.round(summary.warrantyCoverage * 100)}%`}
              sublabel="Of purchases with warranty tracked"
            />
            <StatCard
              label="Categories"
              value={String(categoryRows.length)}
              sublabel="Distinct categories logged"
            />
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Spending by category
              </h2>
              <p className="text-xs text-slate-500">
                Share of {formatCurrency(summary.totalSpending, 2)}
              </p>
            </div>
            <CategoryBars rows={categoryRows} total={summary.totalSpending} />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">Warranty coverage</h2>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sublabel}</p>
    </div>
  );
}

interface CategoryRow {
  name: string;
  total: number;
}

function CategoryBars({ rows, total }: { rows: CategoryRow[]; total: number }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No category data yet.</p>;
  }
  const max = rows[0]?.total ?? 0;
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const share = total > 0 ? row.total / total : 0;
        const relative = max > 0 ? row.total / max : 0;
        return (
          <li key={row.name}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-800">{row.name}</span>
              <span className="text-slate-600">
                {formatCurrency(row.total, 2)}
                <span className="ml-2 text-xs text-slate-500">
                  {Math.round(share * 100)}%
                </span>
              </span>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`${row.name} spending share`}
              aria-valuenow={Math.round(share * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${Math.max(relative * 100, 4)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

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
        <span className="text-3xl font-semibold text-slate-900">{percent}%</span>
        <span className="text-xs text-slate-500">of purchases covered</span>
      </div>
      <div
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100"
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
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
          />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-900">Nothing to analyse yet</h2>
      <p className="mt-1 text-sm text-slate-600">
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
          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Quick add
        </Link>
      </div>
    </div>
  );
}
