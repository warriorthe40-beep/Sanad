import { useState, type FormEvent } from 'react';
import {
  clearApiKey,
  getApiKey,
  maskApiKey,
  setApiKey,
} from '@/services/settings/apiKey';
import { purchaseRepository, documentRepository } from '@/data/repositories';
import { getCurrentUserId } from '@/shared/utils/currentUser';

/**
 * SettingsPage — user-managed configuration: Anthropic API key and data export.
 */
export default function SettingsPage() {
  const [savedKey, setSavedKey] = useState<string | null>(() => getApiKey());
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setFeedback({ kind: 'error', text: 'Please paste a key before saving.' });
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setFeedback({
        kind: 'error',
        text: 'That doesn't look like an Anthropic key. It should start with "sk-ant-".',
      });
      return;
    }
    setApiKey(trimmed);
    setSavedKey(trimmed);
    setDraft('');
    setFeedback({ kind: 'success', text: 'API key saved. You can now scan receipts.' });
  }

  function handleClear() {
    clearApiKey();
    setSavedKey(null);
    setDraft('');
    setFeedback({ kind: 'success', text: 'API key removed.' });
  }

  async function handleExportJSON() {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const userId = getCurrentUserId();
      const purchases = await purchaseRepository.getByUserId(userId);

      const purchasesWithDocs = await Promise.all(
        purchases.map(async (p) => {
          const docs = await documentRepository.getByPurchaseId(p.id);
          return {
            id: p.id,
            storeName: p.storeName,
            categoryName: p.categoryName,
            productName: p.productName ?? null,
            price: p.price,
            purchaseDate: p.purchaseDate.toISOString().slice(0, 10),
            warrantyDuration: p.warrantyDuration ?? null,
            warrantyEndDate: p.warrantyEndDate?.toISOString().slice(0, 10) ?? null,
            returnWindow: p.returnWindow ?? null,
            returnEndDate: p.returnEndDate?.toISOString().slice(0, 10) ?? null,
            notes: p.notes ?? null,
            documents: docs.map((d) => ({
              id: d.id,
              type: d.type,
              uploadDate: d.uploadDate.toISOString().slice(0, 10),
              imageData: d.imageData,
            })),
          };
        })
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        purchaseCount: purchases.length,
        purchases: purchasesWithDocs,
      };

      triggerDownload(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
        `sanad-export-${todayISO()}.json`
      );
      setExportFeedback({
        kind: 'success',
        text: `${purchases.length} purchase${purchases.length === 1 ? '' : 's'} exported.`,
      });
    } catch (err) {
      setExportFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportCSV() {
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const userId = getCurrentUserId();
      const purchases = await purchaseRepository.getByUserId(userId);

      const headers = [
        'ID', 'Store', 'Category', 'Product Name', 'Price (SAR)',
        'Purchase Date', 'Warranty Duration', 'Warranty End Date',
        'Return Window', 'Return End Date', 'Notes',
      ];
      const rows = purchases.map((p) => [
        p.id,
        p.storeName,
        p.categoryName,
        p.productName ?? '',
        String(p.price),
        p.purchaseDate.toISOString().slice(0, 10),
        p.warrantyDuration ?? '',
        p.warrantyEndDate?.toISOString().slice(0, 10) ?? '',
        p.returnWindow ?? '',
        p.returnEndDate?.toISOString().slice(0, 10) ?? '',
        p.notes ?? '',
      ]);

      const csv = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\r\n');

      // BOM prefix ensures Arabic / Unicode characters render correctly in Excel
      triggerDownload(
        new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }),
        `sanad-export-${todayISO()}.csv`
      );
      setExportFeedback({
        kind: 'success',
        text: `${purchases.length} purchase${purchases.length === 1 ? '' : 's'} exported.`,
      });
    } catch (err) {
      setExportFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure the integrations Sanad uses on your behalf.
        </p>
      </header>

      {/* Anthropic API key */}
      <section className="rounded-xl border border-slate-700 bg-surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Anthropic API key
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Enables AI receipt scanning on the Add Purchase page. Without a
              key, you&apos;ll need to type the store, amount, and date yourself.
            </p>
          </div>
          <StatusBadge saved={Boolean(savedKey)} />
        </div>

        {savedKey ? (
          <p className="mt-4 rounded-md border border-slate-700 bg-surface-elevated px-3 py-2 font-mono text-xs text-slate-300">
            {maskApiKey(savedKey)}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label
              htmlFor="apiKey"
              className="mb-1 block text-sm font-medium text-slate-200"
            >
              {savedKey ? 'Replace key' : 'API key'}
            </label>
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setFeedback(null);
              }}
              placeholder="sk-ant-..."
              className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 font-mono text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {feedback ? (
            <p
              className={
                feedback.kind === 'success'
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800'
                  : 'rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700'
              }
            >
              {feedback.text}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <button
              type="submit"
              className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover"
            >
              Save key
            </button>
            {savedKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex justify-center rounded-md border border-rose-200 bg-surface px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                Remove saved key
              </button>
            ) : null}
          </div>
        </form>

        <div className="mt-6 space-y-3 border-t border-slate-700 pt-5 text-sm text-slate-300">
          <p>
            <span className="font-semibold text-slate-100">Where do I get one?</span>{' '}
            Create a key at{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-hover underline"
            >
              console.anthropic.com/settings/keys
            </a>{' '}
            and paste it above.
          </p>
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <span className="font-semibold">Security note.</span> Sanad is a
            client-only PWA, so your key is stored in this browser&apos;s
            localStorage and sent directly to Anthropic from your device. Anyone
            with access to this machine can read the key from the browser&apos;s
            devtools. For shared or untrusted devices, leave the scanner disabled
            and enter purchases manually.
          </p>
        </div>
      </section>

      {/* Export My Data */}
      <section className="mt-6 rounded-xl border border-slate-700 bg-surface p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-100">Export my data</h2>
        <p className="mt-1 text-sm text-slate-400">
          Download all your purchases as a local backup. JSON includes attached
          receipt images; CSV is a plain spreadsheet without images.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleExportJSON()}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isExporting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
                Preparing…
              </>
            ) : (
              'Export as JSON'
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleExportCSV()}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-surface px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-elevated disabled:opacity-60"
          >
            Export as CSV
          </button>
        </div>

        {exportFeedback ? (
          <p
            className={`mt-3 text-xs ${
              exportFeedback.kind === 'success'
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {exportFeedback.text}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function StatusBadge({ saved }: { saved: boolean }) {
  if (saved) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
        <span aria-hidden="true">●</span> Connected
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      Not configured
    </span>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
