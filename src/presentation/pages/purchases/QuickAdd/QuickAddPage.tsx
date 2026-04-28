import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { purchaseRepository } from '@/data/repositories';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { useCategories } from '@/presentation/hooks/useCategories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import {
  MissingApiKeyError,
  pdfFirstPageToBlob,
  scanReceipt,
  scanReceiptText,
} from '@/application/receiptScanner';
import { hasApiKey } from '@/services/settings/apiKey';
import StoreAutocomplete from '@/presentation/components/StoreAutocomplete';

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
  const categories = useCategories();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(() => !hasApiKey());

  const [frequentStores, setFrequentStores] = useState<string[]>([]);
  const [storeHistory, setStoreHistory] = useState<string[]>([]);

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
        const sorted = [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name);
        setFrequentStores(sorted.slice(0, 5));
        setStoreHistory(sorted);
      })
      .catch(() => {});
  }, []);

  function setStoreName(value: string) {
    setForm((prev) => ({ ...prev, storeName: value }));
    setErrors((prev) => ({ ...prev, storeName: undefined }));
    setSaveError(null);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSaveError(null);
  }

  async function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    if (!hasApiKey()) {
      setApiKeyMissing(true);
      return;
    }
    setIsScanning(true);
    setScanNotice(null);
    try {
      const imageBlob =
        file.type === 'application/pdf' ? await pdfFirstPageToBlob(file) : file;
      const data = await scanReceipt(imageBlob);
      setForm((prev) => ({
        ...prev,
        storeName: prev.storeName || data.storeName,
        price: prev.price || String(data.amount),
      }));
      setScanNotice(`Extracted ${data.storeName} · ${data.amount} SAR.`);
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setApiKeyMissing(true);
      } else {
        setScanNotice(
          err instanceof Error
            ? err.message
            : 'Could not read that receipt. Enter details manually.'
        );
      }
    } finally {
      setIsScanning(false);
    }
  }

  async function handlePasteExtract() {
    const text = pasteText.trim();
    if (!text) return;
    if (!hasApiKey()) {
      setApiKeyMissing(true);
      return;
    }
    setIsPasting(true);
    setPasteNotice(null);
    try {
      const data = await scanReceiptText(text);
      setForm((prev) => ({
        ...prev,
        storeName: prev.storeName || data.storeName,
        price: prev.price || String(data.amount),
      }));
      setPasteNotice(`Extracted ${data.storeName} · ${data.amount} SAR.`);
      setPasteText('');
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setApiKeyMissing(true);
      } else {
        setPasteNotice(
          err instanceof Error
            ? err.message
            : 'Could not extract from text. Enter details manually.'
        );
      }
    } finally {
      setIsPasting(false);
    }
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

  const isWorking = isScanning || isPasting || isSaving;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Quick add
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Everyday purchases, dated today. No warranty tracking.
        </p>
      </header>

      {/* Frequently Visited */}
      {frequentStores.length > 0 ? (
        <section className="mb-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Frequently visited
          </p>
          <div className="flex flex-wrap gap-2">
            {frequentStores.map((name) => (
              <button
                key={name}
                type="button"
                disabled={isWorking}
                onClick={() => setStoreName(name)}
                className="rounded-full border border-slate-700 bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand hover:text-brand disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* API key banner */}
      {apiKeyMissing ? (
        <div className="mb-4 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Receipt scanning is off.</p>
            <p className="mt-0.5 text-xs text-amber-800">
              Add your Anthropic API key in Settings to use scan features.
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

      {/* Receipt entry methods */}
      <div
        className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${apiKeyMissing ? 'opacity-60' : ''}`}
      >
        {/* Upload & Scan / Take a Photo */}
        <section className="flex flex-col gap-3 rounded-xl border border-dashed border-brand/60 bg-brand-soft/40 p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleReceiptChange}
            disabled={isWorking}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleReceiptChange}
            disabled={isWorking}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-slate-200">Scan a Receipt</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Auto-fill store and price from a photo or file.
            </p>
          </div>
          <button
            type="button"
            disabled={isWorking || apiKeyMissing}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isScanning ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
                Scanning…
              </>
            ) : (
              'Upload & Scan'
            )}
          </button>
          <button
            type="button"
            disabled={isWorking || apiKeyMissing}
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-brand px-4 py-2 text-sm font-semibold text-brand-hover hover:bg-brand hover:text-white disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
              <path
                fillRule="evenodd"
                d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                clipRule="evenodd"
              />
            </svg>
            Take a Photo
          </button>
          {scanNotice ? (
            <p className="text-sm text-slate-300">{scanNotice}</p>
          ) : null}
        </section>

        {/* Paste Receipt Message */}
        <section className="flex flex-col gap-3 rounded-xl border border-dashed border-brand/60 bg-brand-soft/40 p-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Paste Receipt Message</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Paste text from an email or SMS receipt to auto-fill the form.
            </p>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            disabled={isPasting || isSaving || apiKeyMissing}
            placeholder="Paste your receipt text here…"
            rows={4}
            className="block w-full resize-none rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            disabled={isPasting || isSaving || apiKeyMissing || !pasteText.trim()}
            onClick={() => void handlePasteExtract()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isPasting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
                Extracting…
              </>
            ) : (
              'Extract'
            )}
          </button>
          {pasteNotice ? (
            <p className="text-sm text-slate-300">{pasteNotice}</p>
          ) : null}
        </section>
      </div>

      {/* Manual form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="storeName"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Store <span className="text-rose-600">*</span>
          </label>
          <StoreAutocomplete
            value={form.storeName}
            onChange={setStoreName}
            storeHistory={storeHistory}
            disabled={isWorking}
            hasError={Boolean(errors.storeName)}
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
            disabled={isWorking}
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
            disabled={isWorking}
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
            disabled={isWorking}
            className="inline-flex justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isWorking}
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
