import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MissingApiKeyError, pdfFirstPageToBlob, scanReceipt, scanReceiptText, semanticStoreSearch } from '@/application/receiptScanner';
import { documentRepository, purchaseRepository, storeAliasRepository } from '@/data/repositories';
import type { StoreAlias } from '@/data/models';
import { hasApiKey } from '@/services/settings/apiKey';
import { getSuggestion, updateFromUser, type Suggestion } from '@/application/suggestions';
import { resolveStoreName, normalizeStoreName } from '@/application/storeIntelligence';
import { calculateWarrantyEndDate, scheduleAlerts } from '@/application/warranty';
import { validatePurchase, type PurchaseValidationErrors } from '@/application/validation';
import { useCategories } from '@/presentation/hooks/useCategories';
import { getCurrentUserId } from '@/shared/utils/currentUser';
import DurationOrEndDateField, {
  fromPurchase,
  toDurationString,
  toEndDate,
  type DurationOrEndDateValue,
} from '@/presentation/components/DurationOrEndDateField';
import StoreAutocomplete from '@/presentation/components/StoreAutocomplete';
import GlobalSyncModal from '@/presentation/components/GlobalSyncModal';

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
  const categories = useCategories();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [warranty, setWarranty] = useState<DurationOrEndDateValue>(INITIAL_WARRANTY);
  const [returnWindow, setReturnWindow] =
    useState<DurationOrEndDateValue>(INITIAL_RETURN);
  const [errors, setErrors] = useState<PurchaseValidationErrors>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [isPasting, setIsPasting] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(() => !hasApiKey());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const previewObjectUrl = useRef<string | null>(null);
  const uploadedFile = useRef<File | null>(null);
  const [storeHistory, setStoreHistory] = useState<string[]>([]);
  const [aliases, setAliases] = useState<StoreAlias[]>([]);
  const [rawAIExtracted, setRawAIExtracted] = useState<string | null>(null);
  const [aiResolvedName, setAiResolvedName] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState<{
    originalName: string;
    newName: string;
    count: number;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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
    storeAliasRepository.getByUserId(userId).then(setAliases).catch(() => {});
  }, []);

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

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    };
  }, []);

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

  function handleStoreChange(value: string) {
    setForm((prev) => ({ ...prev, storeName: value }));
    setErrors((prev) => ({ ...prev, storeName: undefined }));
    setSaveError(null);
  }

  // After alias lookup: if the extracted name wasn't matched by an alias,
  // ask Claude semantically (handles cross-script / genuinely different names).
  // Silently saves the new alias so subsequent scans skip this call.
  async function resolveWithSemanticFallback(
    extracted: string,
    resolved: string,
    userId: string
  ): Promise<string> {
    if (resolved !== extracted || !storeHistory.length) return resolved;
    try {
      const matches = await semanticStoreSearch(extracted, storeHistory);
      if (!matches.length) return resolved;
      const matched = matches[0];
      const rawNorm = normalizeStoreName(extracted);
      storeAliasRepository.upsert(userId, rawNorm, matched).catch(() => {});
      setAliases((prev) => {
        if (prev.some((a) => a.rawName === rawNorm)) return prev;
        return [...prev, { id: crypto.randomUUID(), userId, rawName: rawNorm, cleanName: matched }];
      });
      return matched;
    } catch {
      return resolved;
    }
  }

  // Steps 2–6: user uploads a receipt photo/PDF, we call the scanner and
  // merge the extracted fields into the form (without clobbering fields the
  // user has already typed).
  async function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Keep a reference to the file so we can save it as a receipt document after submit
    uploadedFile.current = file;

    // Create preview URL for the uploaded file
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    const url = URL.createObjectURL(file);
    previewObjectUrl.current = url;
    setPreviewUrl(url);
    setPreviewType(file.type === 'application/pdf' ? 'pdf' : 'image');
    setZoomScale(1);

    if (!hasApiKey()) {
      setApiKeyMissing(true);
      setScanNotice(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsScanning(true);
    setScanNotice(null);
    try {
      const userId = getCurrentUserId();
      const freshAliases = await storeAliasRepository.getByUserId(userId).catch(() => aliases);
      setAliases(freshAliases);
      const imageBlob =
        file.type === 'application/pdf' ? await pdfFirstPageToBlob(file) : file;
      const data = await scanReceipt(imageBlob, storeHistory, freshAliases);
      const aliasResolved = resolveStoreName(data.storeName, freshAliases);
      const resolved = await resolveWithSemanticFallback(data.storeName, aliasResolved, userId);
      setRawAIExtracted(data.storeName);
      setAiResolvedName(resolved);
      setForm((prev) => ({
        ...prev,
        storeName: prev.storeName || resolved,
        price: prev.price || String(data.amount),
        purchaseDate: toISODate(data.date),
      }));
      setScanNotice(
        `Extracted ${resolved} · ${data.amount} SAR · ${toISODate(data.date)}.`
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
      const userId = getCurrentUserId();
      const freshAliases = await storeAliasRepository.getByUserId(userId).catch(() => aliases);
      setAliases(freshAliases);
      const data = await scanReceiptText(text, storeHistory, freshAliases);
      const aliasResolved = resolveStoreName(data.storeName, freshAliases);
      const resolved = await resolveWithSemanticFallback(data.storeName, aliasResolved, userId);
      setRawAIExtracted(data.storeName);
      setAiResolvedName(resolved);
      setForm((prev) => ({
        ...prev,
        storeName: prev.storeName || resolved,
        price: prev.price || String(data.amount),
        purchaseDate: toISODate(data.date),
      }));
      setPasteNotice(
        `Extracted ${resolved} · ${data.amount} SAR · ${toISODate(data.date)}.`
      );
      setPasteText('');
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setApiKeyMissing(true);
      } else {
        setPasteNotice(
          err instanceof Error
            ? err.message
            : 'Could not extract from text. Please enter details manually.'
        );
      }
    } finally {
      setIsPasting(false);
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

      // Save the scanned receipt as a Document linked to this purchase.
      if (uploadedFile.current) {
        try {
          const file = uploadedFile.current;
          const imageBlob =
            file.type === 'application/pdf' ? await pdfFirstPageToBlob(file) : file;
          const imageData = await readFileAsDataUrl(imageBlob);
          await documentRepository.create({
            purchaseId: saved.id,
            imageData,
            type: 'receipt',
            uploadDate: new Date(),
          });
        } catch {
          // Non-fatal: purchase is saved; document attachment is best-effort.
        }
      }

      // Step 15: feed the community dataset.
      await updateFromUser(
        saved.storeName,
        saved.categoryName,
        saved.warrantyDuration ?? '',
        saved.returnWindow ?? ''
      );

      // Steps 17–20: schedule expiry alerts for whichever end dates exist.
      if (warrantyEndDate) {
        await scheduleAlerts(saved.id, draft.purchaseDate!, warrantyEndDate, 'warranty');
      }
      if (returnEndDate) {
        await scheduleAlerts(saved.id, draft.purchaseDate!, returnEndDate, 'return');
      }

      // Steps 21–22: check for global sync, then navigate.
      const submittedStore = draft.storeName!;
      if (
        rawAIExtracted &&
        aiResolvedName !== null &&
        submittedStore.toLowerCase() !== aiResolvedName.toLowerCase()
      ) {
        const userId = getCurrentUserId();
        const count = await purchaseRepository.countByStoreName(userId, rawAIExtracted);
        setSyncPending({ originalName: rawAIExtracted, newName: submittedStore, count });
      } else {
        navigate('/purchases', { replace: true });
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save purchase.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSyncConfirm() {
    if (!syncPending) return;
    setIsSyncing(true);
    try {
      const userId = getCurrentUserId();
      await purchaseRepository.renameStore(userId, syncPending.originalName, syncPending.newName);
      await storeAliasRepository.upsert(
        userId,
        normalizeStoreName(syncPending.originalName),
        syncPending.newName
      );
    } catch {
      // best-effort; purchase already saved
    } finally {
      setIsSyncing(false);
      setSyncPending(null);
      navigate('/purchases', { replace: true });
    }
  }

  function handleSyncSkip() {
    setSyncPending(null);
    navigate('/purchases', { replace: true });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      {syncPending ? (
        <GlobalSyncModal
          originalName={syncPending.originalName}
          newName={syncPending.newName}
          matchCount={syncPending.count}
          isApplying={isSyncing}
          onConfirm={() => void handleSyncConfirm()}
          onSkip={handleSyncSkip}
        />
      ) : null}
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

      <div className={`mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${apiKeyMissing ? 'opacity-60' : ''}`}>
        {/* Upload & Scan / Take a Photo */}
        <section className="flex flex-col gap-3 rounded-xl border border-dashed border-brand/60 bg-brand-soft/40 p-4">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleReceiptChange}
            disabled={isScanning || isSaving}
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
            disabled={isScanning || isSaving}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-medium text-slate-200">Scan a Receipt</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Upload a file or take a photo to auto-fill store, amount, and date.
            </p>
          </div>

          <button
            type="button"
            disabled={isScanning || isSaving || apiKeyMissing}
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
            disabled={isScanning || isSaving || apiKeyMissing}
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

          {previewUrl ? (
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label="View full size"
                onClick={() => { setIsLightboxOpen(true); setZoomScale(1); }}
                className="group relative overflow-hidden rounded-lg border border-slate-700 bg-surface transition-colors hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
              >
                {previewType === 'image' ? (
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="h-20 w-20 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-rose-400">
                      <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
                      <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
                    </svg>
                    <span className="text-xs font-medium">PDF</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
              <div className="flex-1">
                {scanNotice ? (
                  <p className="text-sm text-slate-300">{scanNotice}</p>
                ) : (
                  <p className="text-xs text-slate-500">Tap the thumbnail to zoom in.</p>
                )}
              </div>
            </div>
          ) : !isScanning && scanNotice ? (
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

      {isLightboxOpen && previewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Receipt preview"
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
          }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
            {previewType === 'image' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoomScale((s) => Math.max(0.25, s - 0.25))}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 text-white hover:bg-white/10 disabled:opacity-40"
                  disabled={zoomScale <= 0.25}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-white/80">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => setZoomScale((s) => Math.min(5, s + 0.25))}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 text-white hover:bg-white/10 disabled:opacity-40"
                  disabled={zoomScale >= 5}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                >
                  Reset
                </button>
              </div>
            ) : (
              <span className="text-sm text-white/60">PDF — use browser controls to zoom</span>
            )}
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setIsLightboxOpen(false)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {previewType === 'image' ? (
              <div
                style={{ width: `${Math.max(zoomScale * 100, 100)}%` }}
                className="min-h-full flex items-start justify-center p-4"
              >
                <img
                  src={previewUrl}
                  alt="Receipt full view"
                  className="w-full h-auto select-none"
                  draggable={false}
                />
              </div>
            ) : (
              <iframe
                src={previewUrl}
                title="Receipt PDF"
                className="h-full w-full border-0"
              />
            )}
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Field
          label="Product name"
          name="productName"
          value={form.productName}
          onChange={handleChange}
          placeholder="Optional"
          disabled={isSaving}
        />

        <div>
          <label
            htmlFor="storeName"
            className="mb-1 block text-sm font-medium text-slate-200"
          >
            Store <span className="text-rose-600">*</span>
          </label>
          <StoreAutocomplete
            value={form.storeName}
            onChange={handleStoreChange}
            storeHistory={storeHistory}
            disabled={isSaving}
            hasError={Boolean(errors.storeName)}
            placeholder="e.g. Jarir"
          />
          {errors.storeName ? (
            <p className="mt-1 text-xs text-rose-600">{errors.storeName}</p>
          ) : null}
        </div>

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

function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read file.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}
