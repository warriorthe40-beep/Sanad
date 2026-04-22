import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MissingApiKeyError, scanReceipt } from '@/application/receiptScanner';
import { hasApiKey } from '@/services/settings/apiKey';
import { getSuggestion, updateFromUser, type Suggestion } from '@/application/suggestions';
import { calculateWarrantyEndDate, scheduleAlerts } from '@/application/warranty';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { purchaseRepository } from '@/data/repositories';
import { DEFAULT_CATEGORIES } from '@/shared/constants/categories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import DurationOrEndDateField, {
  fromPurchase,
  toDurationString,
  toEndDate,
  type DurationOrEndDateValue,
} from '@/presentation/components/DurationOrEndDateField';

/**
 * AddPurchasePage — full "Add Purchase with AI Receipt Scanning" flow from the
 * sequence diagram. Implemented steps (User / AddPurchasePage column on the
 * left, application + data layers on the right):
 *
 *   1.  User opens Add Purchase   → component mount
 *   2.  Upload receipt photo      → file input
 *   3–6. scanReceipt()            → fills storeName / price / date
 *   7–8. getSuggestion()          → community / seed warranty hints
 *   9–13. User reviews + edits    → form state
 *   14.  validate()               → validatePurchase()
 *   15.  updateFromUser()         → bumps community reportCount
 *   16.  calculateWarrantyEndDate()
 *   17–20. scheduleAlerts()       → 90/60/30/7-day Alert rows
 *   21–22. Success + navigate     → /purchases
 */

interface FormState {
  productName: string;
  storeName: string;
  categoryName: string;
  price: string;
  purchaseDate: string;
  notes: string;
}

function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const INITIAL_FORM: FormState = {
  productName: '',
  storeName: '',
  categoryName: '',
  price: '',
  purchaseDate: todayISO(),
  notes: '',
};

const INITIAL_WARRANTY: DurationOrEndDateValue = { mode: 'none' };
const INITIAL_RETURN: DurationOrEndDateValue = { mode: 'none' };

export default function AddPurchasePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [warranty, setWarranty] = useState<DurationOrEndDateValue>(INITIAL_WARRANTY);
  const [returnWindow, setReturnWindow] =
    useState<DurationOrEndDateValue>(INITIAL_RETURN);
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(() => !hasApiKey());

  // Steps 7–8: re-fetch the community suggestion whenever the
  // (store, category) pair becomes complete.
  useEffect(() => {
    const store = form.storeName.trim();
    const category = form.categoryName.trim();
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
  }, [form.storeName, form.categoryName]);

  const suggestionMessage = useMemo(() => {
    if (!suggestion) return null;
    const src = suggestion.source === 'community' ? 'Community' : 'Seed';
    const parts: string[] = [];
    if (suggestion.warranty) parts.push(`warranty ${suggestion.warranty}`);
    if (suggestion.returnWindow) parts.push(`return ${suggestion.returnWindow}`);
    return parts.length > 0 ? `${src} suggests: ${parts.join(' · ')}` : null;
  }, [suggestion]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSaveError(null);
  }

  // Steps 2–6: user uploads a receipt photo, we call the mock scanner and
  // merge the extracted fields into the form (without clobbering fields the
  // user has already typed).
  async function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!hasApiKey()) {
      setApiKeyMissing(true);
      setScanNotice(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsScanning(true);
    setScanNotice(null);
    try {
      const data = await scanReceipt(file);
      setForm((prev) => ({
        ...prev,
        storeName: prev.storeName || data.storeName,
        price: prev.price || String(data.amount),
        purchaseDate: prev.purchaseDate || toISODate(data.date),
      }));
      setScanNotice(
        `Extracted ${data.storeName} · ${data.amount} SAR · ${toISODate(data.date)}.`
      );
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setApiKeyMissing(true);
      } else {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not read that receipt. Please enter the details manually.';
        setScanNotice(message);
      }
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const purchaseDate = new Date(form.purchaseDate);
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

    // Step 14: validate()
    const { valid, errors: fieldErrors } = validatePurchase(draft);
    if (!valid) {
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      // Step 16: warranty and return window end dates.
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

      // Persist the purchase (create()).
      const saved = await purchaseRepository.create({
        productName: draft.productName,
        storeName: draft.storeName!,
        categoryName: draft.categoryName!,
        price: draft.price!,
        purchaseDate: draft.purchaseDate!,
        userId: getCurrentUserId(),
        warrantyDuration: draft.warrantyDuration,
        warrantyEndDate,
        returnWindow: draft.returnWindow,
        returnEndDate,
        notes: draft.notes,
      });

      // Step 15: feed the community dataset.
      await updateFromUser(
        saved.storeName,
        saved.categoryName,
        saved.warrantyDuration ?? '',
        saved.returnWindow ?? ''
      );

      // Steps 17–20: schedule expiry alerts for whichever end dates exist.
      if (warrantyEndDate) {
        await scheduleAlerts(saved.id, warrantyEndDate, 'warranty');
      }
      if (returnEndDate) {
        await scheduleAlerts(saved.id, returnEndDate, 'return');
      }

      // Steps 21–22: success.
      navigate('/purchases', { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save purchase.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Add purchase
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Snap the receipt to pre-fill the fields, or type them in yourself.
        </p>
      </header>

      {apiKeyMissing ? (
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Receipt scanning is off.</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Add your Anthropic API key in Settings to auto-fill the store, amount,
              and date from a photo.
            </p>
          </div>
          <Link
            to="/settings"
            className="inline-flex shrink-0 justify-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Open Settings
          </Link>
        </div>
      ) : null}

      <section
        className={`mb-6 rounded-xl border border-dashed border-brand/60 bg-brand-soft/40 p-4 ${
          apiKeyMissing ? 'opacity-60' : ''
        }`}
      >
        <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-slate-200">
            Scan a receipt
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReceiptChange}
            disabled={isScanning || isSaving}
            className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-hover disabled:opacity-60 sm:w-auto"
          />
        </label>
        {isScanning ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-brand-hover">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-brand/40 border-t-brand-hover"
            />
            Scanning receipt…
          </p>
        ) : scanNotice ? (
          <p className="mt-3 text-sm text-slate-300">{scanNotice}</p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            We&apos;ll extract the store, amount, and date. You can always edit them below.
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Product name"
          name="productName"
          value={form.productName}
          onChange={handleChange}
          placeholder="Optional"
          disabled={isSaving}
        />

        <Field
          label="Store"
          name="storeName"
          value={form.storeName}
          onChange={handleChange}
          required
          disabled={isSaving}
          error={errors.storeName}
          placeholder="e.g. Jarir"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">
            Category <span className="text-rose-600">*</span>
          </label>
          <select
            name="categoryName"
            value={form.categoryName}
            onChange={handleChange}
            disabled={isSaving}
            className={selectClass(Boolean(errors.categoryName))}
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
            placeholder="0.00"
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
            }}
            minDate={form.purchaseDate}
            disabled={isSaving}
            error={errors.returnWindow}
            defaultUnit="days"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-200">Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            disabled={isSaving}
            className={inputClass(false)}
            placeholder="Anything worth remembering about this purchase"
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
            disabled={isSaving || isScanning}
            className="inline-flex justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save purchase'}
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

function selectClass(hasError: boolean): string {
  return inputClass(hasError);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
