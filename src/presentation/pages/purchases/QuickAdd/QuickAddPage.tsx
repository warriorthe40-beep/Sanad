import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseRepository } from '@/data/repositories';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { DEFAULT_CATEGORIES } from '@/shared/constants/categories';
import { getCurrentUserId } from '@/shared/utils/currentUser';

/**
 * QuickAddPage — a three-field purchase form for everyday items where no
 * warranty tracking is needed (coffee, groceries). Date is fixed to today;
 * the full AddPurchasePage is the right tool for warranted items.
 */

interface FormState {
  storeName: string;
  categoryName: string;
  price: string;
}

const INITIAL_FORM: FormState = {
  storeName: '',
  categoryName: '',
  price: '',
};

export default function QuickAddPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const price = Number.parseFloat(form.price);
    const purchaseDate = new Date();

    const draft = {
      storeName: form.storeName.trim(),
      categoryName: form.categoryName.trim(),
      price: Number.isNaN(price) ? undefined : price,
      purchaseDate,
    };

    const { valid, errors: fieldErrors } = validatePurchase(draft);
    if (!valid) {
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await purchaseRepository.create({
        storeName: draft.storeName!,
        categoryName: draft.categoryName!,
        price: draft.price!,
        purchaseDate: draft.purchaseDate,
        userId: getCurrentUserId(),
      });
      navigate('/purchases', { replace: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save purchase.');
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Quick add
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Three fields. Dated today. For everyday purchases with no warranty to track.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="storeName"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Store <span className="text-rose-600">*</span>
          </label>
          <input
            id="storeName"
            name="storeName"
            type="text"
            value={form.storeName}
            onChange={handleChange}
            disabled={isSaving}
            placeholder="e.g. Carrefour"
            className={inputClass(Boolean(errors.storeName))}
            autoFocus
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

        <div>
          <label
            htmlFor="price"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Price (SAR) <span className="text-rose-600">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.price}
            onChange={handleChange}
            disabled={isSaving}
            placeholder="0.00"
            className={inputClass(Boolean(errors.price))}
          />
          {errors.price ? (
            <p className="mt-1 text-xs text-rose-600">{errors.price}</p>
          ) : null}
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
            {isSaving ? 'Saving…' : 'Save'}
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

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-elevated';
  return `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-700 focus:border-brand focus:ring-brand/30'
  }`;
}
