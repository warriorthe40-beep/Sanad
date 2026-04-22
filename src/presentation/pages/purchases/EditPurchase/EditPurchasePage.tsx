import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Purchase } from '@/data/models';
import { alertRepository, purchaseRepository } from '@/data/repositories';
import { calculateWarrantyEndDate, scheduleAlerts } from '@/application/warranty';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { DEFAULT_CATEGORIES } from '@/shared/constants/categories';

/**
 * EditPurchasePage — blueprint §3.5 ("edit any existing purchase,
 * including adding warranty info or documents later").
 *
 * Loads the Purchase via the repository, pre-fills the form, and calls
 * `purchaseRepository.update` on save. If the warranty duration or
 * return window changes the end-date is recomputed and alerts are
 * regenerated: existing alerts for the purchase are deleted and fresh
 * 90/60/30/7-day reminders are scheduled via `scheduleAlerts`, so the
 * user never sees a stale reminder.
 */
interface FormState {
  productName: string;
  storeName: string;
  categoryName: string;
  price: string;
  purchaseDate: string;
  warrantyDuration: string;
  returnWindow: string;
  notes: string;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function purchaseToForm(p: Purchase): FormState {
  return {
    productName: p.productName ?? '',
    storeName: p.storeName,
    categoryName: p.categoryName,
    price: String(p.price),
    purchaseDate: toISODate(p.purchaseDate),
    warrantyDuration: p.warrantyDuration ?? '',
    returnWindow: p.returnWindow ?? '',
    notes: p.notes ?? '',
  };
}

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setPurchase(null);
      return;
    }
    let cancelled = false;
    void purchaseRepository
      .getById(id)
      .then((item) => {
        if (cancelled) return;
        setPurchase(item);
        if (item) setForm(purchaseToForm(item));
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

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !purchase || isSaving) return;

    const purchaseDate = new Date(form.purchaseDate);
    const price = Number.parseFloat(form.price);
    const draft = {
      productName: form.productName.trim() || undefined,
      storeName: form.storeName.trim(),
      categoryName: form.categoryName.trim(),
      price: Number.isNaN(price) ? undefined : price,
      purchaseDate: Number.isNaN(purchaseDate.getTime()) ? undefined : purchaseDate,
      warrantyDuration: form.warrantyDuration.trim() || undefined,
      returnWindow: form.returnWindow.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    const { valid, errors: fieldErrors } = validatePurchase(draft);
    if (!valid) {
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const warrantyEndDate =
        calculateWarrantyEndDate(draft.purchaseDate!, draft.warrantyDuration) ?? undefined;
      const returnEndDate =
        calculateWarrantyEndDate(draft.purchaseDate!, draft.returnWindow) ?? undefined;

      await purchaseRepository.update(purchase.id, {
        productName: draft.productName,
        storeName: draft.storeName!,
        categoryName: draft.categoryName!,
        price: draft.price!,
        purchaseDate: draft.purchaseDate!,
        warrantyDuration: draft.warrantyDuration,
        warrantyEndDate,
        returnWindow: draft.returnWindow,
        returnEndDate,
        notes: draft.notes,
      });

      const warrantyChanged =
        (purchase.warrantyEndDate?.getTime() ?? null) !==
        (warrantyEndDate?.getTime() ?? null);
      const returnChanged =
        (purchase.returnEndDate?.getTime() ?? null) !==
        (returnEndDate?.getTime() ?? null);

      if (warrantyChanged || returnChanged) {
        const existing = await alertRepository.getByPurchaseId(purchase.id);
        await Promise.all(existing.map((alert) => alertRepository.delete(alert.id)));
        if (warrantyEndDate) {
          await scheduleAlerts(purchase.id, warrantyEndDate, 'warranty');
        }
        if (returnEndDate) {
          await scheduleAlerts(purchase.id, returnEndDate, 'return');
        }
      }

      navigate(`/purchases/${purchase.id}`, { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  }

  if (purchase === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (purchase === null || !form) {
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link to={`/purchases/${purchase.id}`} className="hover:text-brand-hover">
          ← Back to purchase
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Edit purchase
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Update any field. Changing warranty or return windows reschedules the
          reminder alerts.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Product name"
          name="productName"
          value={form.productName}
          onChange={handleChange}
          disabled={isSaving}
          placeholder="Optional"
        />

        <Field
          label="Store"
          name="storeName"
          value={form.storeName}
          onChange={handleChange}
          required
          disabled={isSaving}
          error={errors.storeName}
        />

        <div>
          <label
            htmlFor="categoryName"
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            Category <span className="text-rose-600">*</span>
          </label>
          <select
            id="categoryName"
            name="categoryName"
            value={form.categoryName}
            onChange={handleChange}
            disabled={isSaving}
            className={inputClass(Boolean(errors.categoryName))}
          >
            <option value="">Select a category</option>
            {DEFAULT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.categoryName ? (
            <p className="mt-1 text-xs text-rose-600">{errors.categoryName}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Price (SAR)"
            name="price"
            value={form.price}
            onChange={handleChange}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            disabled={isSaving}
            error={errors.price}
          />
          <Field
            label="Purchase date"
            name="purchaseDate"
            value={form.purchaseDate}
            onChange={handleChange}
            type="date"
            required
            disabled={isSaving}
            error={errors.purchaseDate}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Warranty duration"
            name="warrantyDuration"
            value={form.warrantyDuration}
            onChange={handleChange}
            disabled={isSaving}
            error={errors.warrantyDuration}
            placeholder="e.g. 1 year"
          />
          <Field
            label="Return window"
            name="returnWindow"
            value={form.returnWindow}
            onChange={handleChange}
            disabled={isSaving}
            error={errors.returnWindow}
            placeholder="e.g. 14 days"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1 block text-sm font-medium text-slate-800"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            disabled={isSaving}
            className={inputClass(false)}
          />
        </div>

        {saveError ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {saveError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSaving}
            className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: keyof FormState;
  value: string;
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'email' | 'tel' | 'url' | 'search';
  step?: string;
  min?: string;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  disabled,
  error,
  inputMode,
  step,
  min,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        step={step}
        min={min}
        className={inputClass(Boolean(error))}
      />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50';
  return `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-300 focus:border-brand focus:ring-brand/30'
  }`;
}
