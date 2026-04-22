import { useEffect, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Document, Purchase } from '@/data/models';
import type { DocumentType } from '@/shared/types/common';
import { documentRepository, purchaseRepository } from '@/data/repositories';
import {
  getReturnWindowView,
  getWarrantyStatusView,
  type WarrantyStatusView,
} from '@/application/warranty';
import { formatCurrency, formatDate } from '@/shared/utils/formatting';
import ImageZoomModal from '@/presentation/components/ImageZoomModal';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024; // 2 MB cap on the base64 data URL

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  receipt: 'Receipt',
  warranty_card: 'Warranty card',
  invoice: 'Invoice',
  other: 'Other',
};

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
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType>('receipt');
  const [zoomedDoc, setZoomedDoc] = useState<Document | null>(null);

  useEffect(() => {
    if (!id) {
      setPurchase(null);
      setDocuments([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      purchaseRepository.getById(id),
      documentRepository.getByPurchaseId(id),
    ])
      .then(([item, docs]) => {
        if (cancelled) return;
        setPurchase(item);
        setDocuments(docs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load purchase.');
        setPurchase(null);
        setDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleUploadDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !purchase) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      setDocumentError('Photo is larger than 2 MB. Please choose a smaller file.');
      return;
    }
    setIsUploading(true);
    setDocumentError(null);
    try {
      const imageData = await readFileAsDataUrl(file);
      const created = await documentRepository.create({
        purchaseId: purchase.id,
        imageData,
        type: uploadType,
        uploadDate: new Date(),
      });
      setDocuments((prev) => (prev ? [created, ...prev] : [created]));
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : 'Could not attach document.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(doc: Document) {
    const confirmed = window.confirm('Remove this document?');
    if (!confirmed) return;
    try {
      await documentRepository.delete(doc.id);
      setDocuments((prev) => (prev ? prev.filter((d) => d.id !== doc.id) : prev));
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : 'Could not remove document.');
    }
  }

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

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900">Documents</h2>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="documentType"
              className="text-xs font-medium text-slate-600 sm:mr-1"
            >
              Type
            </label>
            <select
              id="documentType"
              value={uploadType}
              onChange={(event) => setUploadType(event.target.value as DocumentType)}
              disabled={isUploading}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="receipt">Receipt</option>
              <option value="warranty_card">Warranty card</option>
              <option value="invoice">Invoice</option>
              <option value="other">Other</option>
            </select>
            <label
              className={`inline-flex cursor-pointer items-center justify-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-hover ${
                isUploading ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              {isUploading ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadDocument}
                disabled={isUploading}
                className="sr-only"
              />
            </label>
          </div>
        </div>
        {documentError ? (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
            {documentError}
          </p>
        ) : null}
        {documents === null ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No documents yet. Attach a receipt, warranty card, or invoice photo.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => setZoomedDoc(doc)}
                  aria-label={`Zoom ${DOCUMENT_TYPE_LABEL[doc.type]} photo`}
                  className="block w-full"
                >
                  <img
                    src={doc.imageData}
                    alt={DOCUMENT_TYPE_LABEL[doc.type]}
                    className="h-32 w-full object-cover transition group-hover:opacity-90"
                  />
                </button>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {DOCUMENT_TYPE_LABEL[doc.type]}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {formatDate(doc.uploadDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc)}
                    aria-label="Remove document"
                    className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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

      {zoomedDoc ? (
        <ImageZoomModal
          src={zoomedDoc.imageData}
          alt={DOCUMENT_TYPE_LABEL[zoomedDoc.type]}
          onClose={() => setZoomedDoc(null)}
        />
      ) : null}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Could not read the selected file.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
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
