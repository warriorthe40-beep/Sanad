import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Purchase } from '@/data/models';
import { alertRepository, purchaseRepository } from '@/data/repositories';
import { calculateWarrantyEndDate, scheduleAlerts } from '@/application/warranty';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { useCategories } from '@/presentation/hooks/useCategories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import { getSuggestion, type Suggestion } from '@/application/suggestions';
import StoreAutocomplete from '@/presentation/components/StoreAutocomplete';
import DurationOrEndDateField, {
  fromPurchase,
  toDurationString,
  toEndDate,
  type DurationOrEndDateValue,
} from '@/presentation/components/DurationOrEndDateField';

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
    notes: p.notes ?? '',
  };
}

export default function EditPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const categories = useCategories();

  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined);
  const [form, setForm] = useState<FormState | null>(null);
  const [warranty, setWarranty] = useState<DurationOrEndDateValue>({ mode: 'none' });
  const [returnWindow, setReturnWindow] = useState<DurationOrEndDateValue>({
    mode: 'none',
  });
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [storeHistory, setStoreHistory] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

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
        if (item) {
          setForm(purchaseToForm(item));
          setWarranty(
            fromPurchase(item.warrantyDuration, item.warrantyEndDate, 'years')
          );
          setReturnWindow(
            fromPurchase(item.returnWindow, item.returnEndDate, 'days')
          );
        }
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

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    purchaseRepository
      .getByUserId(userId)
      .then((purchases) => {
        const counts = new Map<string, number>();
        for (const p of purchases) {
          counts.set(p.storeName, (counts.get(p.storeName) ?? 0) + 1);
        }
        setStoreHistory(
          [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name)
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const store = form?.storeName.trim() ?? '';
    const category = form?.categoryName.trim() ?? '';
    if (!store || !category) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    void getSuggestion(store, category).then((result) => {
      if (!cancelled) setSuggestion(result);
    });
    return () => {
      cancelled = true;
    };
  }, [form?.storeName, form?.categoryName]);

  const suggestionMessage = useMemo(() => {
    if (!suggestion) return null;
    const src = suggestion.source === 'community' ? 'Community' : 'Seed';
    const parts: string[] = [];
    if (suggestion.warranty) parts.push(`warranty ${suggestion.warranty}`);
    if (suggestion.returnWindow) parts.push(`return ${suggestion.returnWindow}`);
    return parts.length > 0 ? `${src} suggests: ${parts.join(' · ')}` : null;
  }, [suggestion]);

  function applySuggestion() {
    if (!suggestion) return;
    setWarranty((prev) =>
      prev.mode === 'none' && suggestion.warranty
        ? fromPurchase(suggestion.warranty, undefined, 'years')
        : prev
    );
    setReturnWindow((prev) =>
      prev.mode === 'none' && suggestion.returnWindow
        ? fromPurchase(suggestion.returnWindow, undefined, 'days')
        : prev
    );
  }

  function handleStoreChange(value: string) {
    setForm((prev) => (prev ? { ...prev, storeName: value } : prev));
    setErrors((prev) => ({ ...prev, storeName: undefined }));
    setSaveError(null);
  }

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
    const saveNow = new Date();
    purchaseDate.setHours(saveNow.getHours(), saveNow.getMinutes(), 0, 0);
    const price = Number.parseFloat(form.price);
    const warrantyDuration = toDurationString(warranty);
    const returnDuration = toDurationString(returnWindow);
    const draft = {
      productName: form.productName.trim() || undefined,
      storeName: form.storeName.trim(),
      categoryName: form.categoryName.trim(),
      price: Number.isNaN(price) ? undefined : price,
      purchaseDate: Number.isNaN(purchaseDate.getTime()) ? undefined : purchaseDate,
      warrantyDuration,
      returnWindow: returnDuration,
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
      const warrantyEndDate = toEndDate(
        warranty,
        draft.purchaseDate!,
        calculateWarrantyEndDate
      );
      const returnEndDate = toEndDate(
        returnWindow,
        draft.purchaseDate!,
        calculateWarrantyEndDate
      );

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
          await scheduleAlerts(purchase.id, draft.purchaseDate!, warrantyEndDate, 'warranty');
        }
        if (returnEndDate) {
          await scheduleAlerts(purchase.id, draft.purchaseDate!, returnEndDate, 'return');
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
        <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />
      </div>
    );
  }

  if (purchase === null || !form) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="rounded-xl border border-slate-700 bg-surface p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-100">Purchase not found</h1>
          <p className="mt-1 text-sm text-slate-400">
            {loadError ?? 'This purchase may have been deleted.'}
          </p>
          <Link
            to="/purchases"
            className="mt-4 inline-flex rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
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
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Edit purchase
        </h1>
        <p className="mt-1 text-sm text-slate-400">
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

        <div>
          <label htmlFor="storeName" className="mb-1 block text-sm font-medium text-slate-200">
            Store <span className="text-rose-600">*</span>
          </label>
          <StoreAutocomplete
            value={form.storeName}
            onChange={handleStoreChange}
            storeHistory={storeHistory}
            disabled={isSaving}
            hasError={Boolean(errors.storeName)}
          />
          {errors.storeName ? (
            <p className="mt-1 text-xs text-rose-600">{errors.storeName}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="categoryName"
            className="mb-1 block text-sm font-medium text-slate-200"
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
            {categories.map((category) => (
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

        {suggestionMessage ? (
          <div className="flex flex-col gap-2 rounded-lg border border-brand/30 bg-brand-soft/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-200">{suggestionMessage}</p>
            <button
              type="button"
              onClick={applySuggestion}
              disabled={isSaving}
              className="self-start rounded-md border border-brand px-3 py-1.5 text-xs font-semibold text-brand-hover hover:bg-brand hover:text-white disabled:opacity-60 sm:self-auto"
            >
              Apply suggestion
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DurationOrEndDateField
            label="Warranty"
            idPrefix="warranty"
            value={warranty}
            onChange={(next) => {
              setWarranty(next);
              setErrors((prev) => ({ ...prev, warrantyDuration: undefined }));
              setSaveError(null);
            }}
            minDate={form.purchaseDate}
            disabled={isSaving}
            error={errors.warrantyDuration}
            defaultUnit="years"
          />
          <DurationOrEndDateField
            label="Return window"
            idPrefix="return"
            value={returnWindow}
            onChange={(next) => {
              setReturnWindow(next);
              setErrors((prev) => ({ ...prev, returnWindow: undefined }));
              setSaveError(null);
            }}
            minDate={form.purchaseDate}
            disabled={isSaving}
            error={errors.returnWindow}
            defaultUnit="days"
          />
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1 block text-sm font-medium text-slate-200"
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
            className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-surface-elevated disabled:opacity-60"
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
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-200">
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
    'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-elevated';
  return `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-700 focus:border-brand focus:ring-brand/30'
  }`;
}
