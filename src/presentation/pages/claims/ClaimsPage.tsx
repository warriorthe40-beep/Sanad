import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Claim, Purchase } from '@/data/models';
import type { ClaimStatus } from '@/shared/types/common';
import { claimRepository, purchaseRepository } from '@/data/repositories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { formatCurrency, formatDate } from '@/shared/utils/formatting';
import { getWarrantyStatusView } from '@/application/warranty';

/**
 * ClaimsPage — blueprint §3 "Report Issue".
 *
 * Users pick one of their own purchases whose warranty is still active,
 * write a short description, optionally attach a damage photo, and submit
 * a Claim via the ClaimRepository. The UML operation
 * `getReceiptAndWarranty()` is realised by showing the selected
 * purchase's receipt-level info (store, price, warranty end) alongside
 * the form so the user can double-check what they're filing against.
 *
 * Existing claims belonging to the user are listed below, joined to
 * their purchases for display.
 */
type FormState = {
  purchaseId: string;
  description: string;
  damagePhoto?: string;
};

const INITIAL_FORM: FormState = {
  purchaseId: '',
  description: '',
  damagePhoto: undefined,
};

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB cap on the base64 data URL

export default function ClaimsPage() {
  const location = useLocation();
  const preselectedId = (location.state as { purchaseId?: string } | null)
    ?.purchaseId;

  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    purchaseId: preselectedId ?? '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      purchaseRepository.getByUserId(getCurrentUserId()),
      claimRepository.getAllSortedByDate(),
    ])
      .then(([userPurchases, allClaims]) => {
        if (cancelled) return;
        setPurchases(userPurchases);
        const ownedIds = new Set(userPurchases.map((p) => p.id));
        setClaims(allClaims.filter((claim) => ownedIds.has(claim.purchaseId)));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load claims.');
        setPurchases([]);
        setClaims([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const purchasesById = useMemo(() => {
    const map: Record<string, Purchase> = {};
    for (const p of purchases ?? []) map[p.id] = p;
    return map;
  }, [purchases]);

  const claimablePurchases = useMemo(() => {
    if (!purchases) return [];
    const now = new Date();
    return purchases
      .filter((p) => p.warrantyEndDate && p.warrantyEndDate.getTime() > now.getTime())
      .sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());
  }, [purchases]);

  const selectedPurchase = form.purchaseId ? purchasesById[form.purchaseId] : undefined;

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError(null);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, damagePhoto: undefined }));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError('Photo is larger than 2 MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setForm((prev) => ({ ...prev, damagePhoto: result }));
      }
    };
    reader.onerror = () => {
      setFormError('Could not read the selected photo.');
    };
    reader.readAsDataURL(file);
  }

  function handleClearPhoto() {
    setForm((prev) => ({ ...prev, damagePhoto: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const description = form.description.trim();
    if (!form.purchaseId) {
      setFormError('Pick the purchase you want to file a claim against.');
      return;
    }
    if (!description) {
      setFormError('Describe the issue so the store has enough to act on.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const created = await claimRepository.create({
        purchaseId: form.purchaseId,
        description,
        damagePhoto: form.damagePhoto,
        status: 'open',
        dateReported: new Date(),
      });
      setClaims((prev) => (prev ? [created, ...prev] : [created]));
      setForm({ ...INITIAL_FORM });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not file the claim.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Report an issue
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          File a claim against a purchase with an active warranty. Describe what&apos;s
          wrong and optionally attach a damage photo.
        </p>
      </header>

      {loadError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border border-slate-700 bg-surface p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-100">New claim</h2>

          {purchases === null ? (
            <div className="mt-4 h-40 animate-pulse rounded-md bg-surface-elevated" />
          ) : claimablePurchases.length === 0 ? (
            <div className="mt-4 rounded-md border border-dashed border-slate-700 bg-surface-elevated p-6 text-center">
              <p className="text-sm text-slate-300">
                You don&apos;t have any purchases with an active warranty to claim
                against.
              </p>
              <Link
                to="/purchases/new"
                className="mt-4 inline-flex justify-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
              >
                Add a purchase
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-5">
              <div>
                <label
                  htmlFor="purchaseId"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  Purchase <span className="text-rose-600">*</span>
                </label>
                <select
                  id="purchaseId"
                  name="purchaseId"
                  value={form.purchaseId}
                  onChange={handleFieldChange}
                  disabled={isSaving}
                  className={inputClass(false)}
                >
                  <option value="">Select a purchase</option>
                  {claimablePurchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.productName?.trim() || p.storeName) +
                        ' · ' +
                        p.storeName +
                        ' · ' +
                        formatDate(p.purchaseDate)}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Only purchases with an active warranty are listed.
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={form.description}
                  onChange={handleFieldChange}
                  disabled={isSaving}
                  placeholder="What happened, when did you first notice it, and what have you tried?"
                  className={inputClass(false)}
                />
              </div>

              <div>
                <label
                  htmlFor="damagePhoto"
                  className="mb-1 block text-sm font-medium text-slate-200"
                >
                  Damage photo <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="damagePhoto"
                  name="damagePhoto"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isSaving}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-hover"
                />
                {form.damagePhoto ? (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={form.damagePhoto}
                      alt="Damage preview"
                      className="h-24 w-24 rounded-md border border-slate-700 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              {formError ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row-reverse">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
                >
                  {isSaving ? 'Filing…' : 'File claim'}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside>
          <SelectedPurchaseCard purchase={selectedPurchase} />
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-slate-100">Your claims</h2>
        {claims === null ? (
          <ul className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li
                key={index}
                className="h-20 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated"
              />
            ))}
          </ul>
        ) : claims.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-700 bg-surface p-6 text-center text-sm text-slate-400">
            No claims filed yet. Submitted reports will show up here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {claims.map((claim) => (
              <li key={claim.id}>
                <ClaimCard
                  claim={claim}
                  purchase={purchasesById[claim.purchaseId]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SelectedPurchaseCard({ purchase }: { purchase: Purchase | undefined }) {
  if (!purchase) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-5 text-sm text-slate-400">
        Select a purchase to see its receipt and warranty info here.
      </div>
    );
  }
  const warranty = getWarrantyStatusView(purchase);
  const title = purchase.productName?.trim() || purchase.storeName;
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Receipt &amp; warranty
      </p>
      <p className="mt-1 text-base font-semibold text-slate-100">{title}</p>
      <p className="text-sm text-slate-400">
        {purchase.storeName} · {purchase.categoryName}
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Price" value={formatCurrency(purchase.price)} />
        <Row label="Purchased" value={formatDate(purchase.purchaseDate)} />
        {purchase.warrantyEndDate ? (
          <Row label="Warranty ends" value={formatDate(purchase.warrantyEndDate)} />
        ) : null}
        <Row label="Warranty" value={warranty.label} />
      </dl>
      <Link
        to={`/purchases/${purchase.id}`}
        className="mt-4 inline-flex justify-center rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
      >
        View purchase
      </Link>
    </div>
  );
}

function ClaimCard({
  claim,
  purchase,
}: {
  claim: Claim;
  purchase: Purchase | undefined;
}) {
  const title = purchase
    ? purchase.productName?.trim() || purchase.storeName
    : 'Unknown purchase';
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={claim.status} />
            <span className="text-xs text-slate-500">
              Filed {formatDate(claim.dateReported)}
            </span>
          </div>
          <p className="mt-1 text-base font-semibold text-slate-100">{title}</p>
          {purchase ? (
            <p className="text-xs text-slate-500">
              {purchase.storeName} · {formatCurrency(purchase.price)}
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
            {claim.description}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          {claim.damagePhoto ? (
            <img
              src={claim.damagePhoto}
              alt="Damage"
              className="h-20 w-20 rounded-md border border-slate-700 object-cover"
            />
          ) : null}
          {purchase ? (
            <Link
              to={`/purchases/${purchase.id}`}
              className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
            >
              View purchase
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const STATUS_PALETTE: Record<ClaimStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-sky-100 text-sky-800' },
  in_progress: { label: 'In progress', className: 'bg-amber-100 text-amber-800' },
  resolved: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Rejected', className: 'bg-rose-100 text-rose-800' },
};

function StatusChip({ status }: { status: ClaimStatus }) {
  const entry = STATUS_PALETTE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-100">{value}</dd>
    </div>
  );
}

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-elevated';
  return `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-700 focus:border-brand focus:ring-brand/30'
  }`;
}
