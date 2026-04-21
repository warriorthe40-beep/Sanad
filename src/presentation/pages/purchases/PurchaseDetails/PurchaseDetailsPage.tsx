import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Purchase } from '@/data/models';
import { purchaseRepository } from '@/data/repositories';
import {
  getReturnWindowView,
  getWarrantyStatusView,
  type WarrantyStatusView,
} from '@/application/warranty';
import { formatCurrency, formatDate } from '@/shared/utils/formatting';

/**
 * PurchaseDetailsPage — full detail view for a single Purchase.
 *
 * Loads the record by id via `purchaseRepository.getById`, renders product /
 * store / price / date, plus the derived warranty and return-window
 * countdowns from the warranty application module.
 */
export default function PurchaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      setPurchase(null);
      return;
    }
    let cancelled = false;
    void purchaseRepository
      .getById(id)
      .then((item) => {
        if (!cancelled) setPurchase(item);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load purchase.');
        setPurchase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!purchase) return;
    const confirmed = window.confirm('Delete this purchase? This cannot be undone.');
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await purchaseRepository.delete(purchase.id);
      navigate('/purchases', { replace: true });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not delete.');
      setIsDeleting(false);
    }
  }

  if (purchase === undefined) {
    return <DetailsSkeleton />;
  }

  if (purchase === null) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Purchase not found</h1>
          <p className="mt-1 text-sm text-slate-600">
            {loadError ?? 'This purchase may have been deleted.'}
          </p>
          <Link
            to="/purchases"
            className="mt-4 inline-flex rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to purchases
          </Link>
        </div>
      </div>
    );
  }

  const warranty = getWarrantyStatusView(purchase);
  const returnWindow = getReturnWindowView(purchase);
  const title = purchase.productName?.trim() || purchase.storeName;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/purchases" className="hover:text-brand-hover">
          ← Back to purchases
        </Link>
      </nav>

      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {purchase.storeName} · {purchase.categoryName}
          </p>
        </div>
        <p className="text-2xl font-semibold text-slate-900">
          {formatCurrency(purchase.price)}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountdownCard title="Warranty" status={warranty} />
        <CountdownCard title="Return window" status={returnWindow} />
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Details</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Purchase date" value={formatDate(purchase.purchaseDate)} />
          <Info label="Store" value={purchase.storeName} />
          <Info label="Category" value={purchase.categoryName} />
          <Info label="Price" value={formatCurrency(purchase.price)} />
          {purchase.warrantyDuration ? (
            <Info label="Warranty duration" value={purchase.warrantyDuration} />
          ) : null}
          {purchase.warrantyEndDate ? (
            <Info label="Warranty end date" value={formatDate(purchase.warrantyEndDate)} />
          ) : null}
          {purchase.returnWindow ? (
            <Info label="Return window" value={purchase.returnWindow} />
          ) : null}
          {purchase.returnEndDate ? (
            <Info label="Return ends" value={formatDate(purchase.returnEndDate)} />
          ) : null}
        </dl>
        {purchase.notes ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {purchase.notes}
            </p>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex justify-center rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
        <Link
          to={`/purchases/${purchase.id}/edit`}
          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit
        </Link>
        <Link
          to="/claims"
          state={{ purchaseId: purchase.id }}
          className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover sm:mr-auto"
        >
          Report an issue
        </Link>
      </section>
    </div>
  );
}

function CountdownCard({
  title,
  status,
}: {
  title: string;
  status: WarrantyStatusView;
}) {
  const palette: Record<WarrantyStatusView['kind'], string> = {
    none: 'border-slate-200 bg-slate-50 text-slate-600',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    expiring: 'border-amber-200 bg-amber-50 text-amber-900',
    expired: 'border-rose-200 bg-rose-50 text-rose-900',
  };
  return (
    <div className={`rounded-xl border p-4 ${palette[status.kind]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{title}</p>
      <p className="mt-1 text-xl font-semibold">{status.label}</p>
      <p className="mt-1 text-sm opacity-80">{status.detail}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-900">{value}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-slate-200" />
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="mt-4 h-48 animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
