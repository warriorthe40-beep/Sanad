import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Purchase } from '@/data/models';
import { purchaseRepository } from '@/data/repositories';
import { getWarrantyStatusView, type WarrantyStatusView } from '@/application/warranty';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatCurrency, formatDate } from '@/shared/utils/formatting';

const ALL_CATEGORIES = '__all__';

/**
 * PurchaseListPage — the user dashboard. Fetches every purchase owned by the
 * current user from `purchaseRepository`, renders them as a responsive grid
 * of cards, and provides a product-name search + category filter.
 *
 * A floating Quick Add button on the bottom-right navigates to
 * `/purchases/new/quick` for the "under-30-seconds, no-warranty" flow.
 */
export default function PurchaseListPage() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    void purchaseRepository
      .getByUserId(getCurrentUserId())
      .then((items) => {
        if (cancelled) return;
        const sorted = [...items].sort(
          (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
        );
        setPurchases(sorted);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load purchases.');
        setPurchases([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    if (!purchases) return [];
    return Array.from(new Set(purchases.map((p) => p.categoryName))).sort();
  }, [purchases]);

  const visible = useMemo(() => {
    if (!purchases) return [];
    const needle = query.trim().toLowerCase();
    return purchases.filter((purchase) => {
      if (category !== ALL_CATEGORIES && purchase.categoryName !== category) {
        return false;
      }
      if (!needle) return true;
      const haystack = [purchase.productName, purchase.storeName, purchase.categoryName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [purchases, query, category]);

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
            Your purchases
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Everything you&apos;ve logged, from coffees to laptops.
          </p>
        </div>
        <Link
          to="/purchases/new"
          className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          Add purchase
        </Link>
      </header>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search purchases</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product, store, or category"
            className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </label>
        <label className="sm:w-56">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value={ALL_CATEGORIES}>All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      {purchases === null ? (
        <PurchaseListSkeleton />
      ) : purchases.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <NoMatches onReset={() => { setQuery(''); setCategory(ALL_CATEGORIES); }} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((purchase) => (
            <li key={purchase.id}>
              <PurchaseCard purchase={purchase} />
            </li>
          ))}
        </ul>
      )}

      <QuickAddFab />
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const warranty = getWarrantyStatusView(purchase);
  const title = purchase.productName?.trim() || purchase.storeName;

  return (
    <Link
      to={`/purchases/${purchase.id}`}
      className="group flex h-full flex-col rounded-xl border border-slate-700 bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-100 group-hover:text-brand-hover">
            {title}
          </h2>
          <p className="mt-0.5 truncate text-sm text-slate-400">
            {purchase.storeName} · {purchase.categoryName}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-100">
          {formatCurrency(purchase.price)}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-slate-500">{formatDate(purchase.purchaseDate)}</span>
        <WarrantyBadge status={warranty} />
      </div>
    </Link>
  );
}

function WarrantyBadge({ status }: { status: WarrantyStatusView }) {
  const styles: Record<WarrantyStatusView['kind'], string> = {
    none: 'bg-surface-muted text-slate-400',
    active: 'bg-emerald-100 text-emerald-800',
    expiring: 'bg-amber-100 text-amber-800',
    expired: 'bg-rose-100 text-rose-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status.kind]}`}
    >
      {status.label}
    </span>
  );
}

function PurchaseListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <li
          key={index}
          className="h-28 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated"
        />
      ))}
    </ul>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-10 text-center">
      <h2 className="text-lg font-semibold text-slate-100">No purchases yet</h2>
      <p className="mt-1 text-sm text-slate-400">
        Log your first purchase to start tracking warranties and returns.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/purchases/new')}
          className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
        >
          Add a purchase
        </button>
        <button
          type="button"
          onClick={() => navigate('/purchases/new/quick')}
          className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
        >
          Quick add
        </button>
      </div>
    </div>
  );
}

function NoMatches({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-8 text-center">
      <h2 className="text-base font-semibold text-slate-100">Nothing matches</h2>
      <p className="mt-1 text-sm text-slate-400">
        Try a different search term or category.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
      >
        Clear filters
      </button>
    </div>
  );
}

/**
 * Floating Quick Add button. Fixed bottom-right on every screen size so it
 * stays reachable on mobile. Uses `aria-label` because the icon alone isn't
 * readable by a screen reader.
 */
function QuickAddFab() {
  return (
    <Link
      to="/purchases/new/quick"
      aria-label="Quick add purchase"
      title="Quick add"
      className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:bg-brand-hover hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand/50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    </Link>
  );
}
