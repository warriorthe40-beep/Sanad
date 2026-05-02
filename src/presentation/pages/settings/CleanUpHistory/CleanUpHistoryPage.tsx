import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  clusterStoreNames,
  normalizeStoreName,
  MissingApiKeyError,
  type StoreCluster,
} from '@/application/storeIntelligence';
import { purchaseRepository, storeAliasRepository } from '@/data/repositories';
import { getCurrentUserId } from '@/shared/utils/currentUser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClusterCard {
  id: string;
  variants: string[];
  canonical: string;
  status: 'pending' | 'approved' | 'dismissed';
  isApplying: boolean;
}

type Phase = 'loading' | 'clustering' | 'ready' | 'clean' | 'error';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CleanUpHistoryPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cards, setCards] = useState<ClusterCard[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void run();
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  async function run() {
    setPhase('loading');
    setErrorMsg(null);
    try {
      const userId = getCurrentUserId();
      const purchases = await purchaseRepository.getByUserId(userId);
      const distinct = [...new Set(purchases.map((p) => p.storeName))];

      if (distinct.length <= 1) {
        setPhase('clean');
        return;
      }

      setPhase('clustering');
      const clusters = await clusterStoreNames(distinct);

      if (clusters.length === 0) {
        setPhase('clean');
        return;
      }

      setCards(
        clusters.map((c: StoreCluster, i) => ({
          id: String(i),
          variants: c.variants,
          canonical: c.canonical,
          status: 'pending',
          isApplying: false,
        }))
      );
      setPhase('ready');
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setErrorMsg('An Anthropic API key is required. Add one in Settings to use this feature.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      }
      setPhase('error');
    }
  }

  function updateCard(id: string, patch: Partial<ClusterCard>) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  async function handleApprove(id: string) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    updateCard(id, { isApplying: true });

    try {
      const userId = getCurrentUserId();
      let totalPurchases = 0;
      let variantCount = 0;

      for (const variant of card.variants) {
        if (variant.toLowerCase() === card.canonical.toLowerCase()) continue;
        variantCount++;
        const count = await purchaseRepository.countByStoreName(userId, variant);
        totalPurchases += count;
        await purchaseRepository.renameStore(userId, variant, card.canonical);
        await storeAliasRepository.upsert(
          userId,
          normalizeStoreName(variant),
          card.canonical
        );
      }

      updateCard(id, { status: 'approved', isApplying: false });
      setToast(
        `Successfully merged ${variantCount} variant${variantCount === 1 ? '' : 's'} across ${totalPurchases} purchase${totalPurchases === 1 ? '' : 's'}.`
      );
    } catch {
      updateCard(id, { isApplying: false });
    }
  }

  function handleDismiss(id: string) {
    updateCard(id, { status: 'dismissed' });
  }

  const pending = cards.filter((c) => c.status === 'pending');
  const allResolved =
    cards.length > 0 && cards.every((c) => c.status !== 'pending');

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      {/* Toast */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-700 bg-emerald-900/90 px-5 py-3 text-sm font-medium text-emerald-100 shadow-xl backdrop-blur-sm"
        >
          {toast}
        </div>
      ) : null}

      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/settings" className="hover:text-brand-hover">
          ← Back to Settings
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Clean Up History
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          AI scans your store names for likely duplicates and lets you merge
          them into one canonical name.
        </p>
      </header>

      {/* Loading */}
      {(phase === 'loading' || phase === 'clustering') ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-700 bg-surface p-10 text-center">
          <span
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-brand"
          />
          <p className="text-sm text-slate-400">
            {phase === 'loading' ? 'Loading your purchase history…' : 'Analysing store names with AI…'}
          </p>
        </div>
      ) : null}

      {/* Clean */}
      {(phase === 'clean' || allResolved) ? (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-8 text-center">
          <p className="text-2xl">✓</p>
          <p className="mt-2 text-base font-semibold text-emerald-300">
            Your history is clean.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            No duplicate store names were detected.
          </p>
        </div>
      ) : null}

      {/* Error */}
      {phase === 'error' ? (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-6 text-center">
          <p className="text-sm text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={() => void run()}
            className="mt-4 inline-flex rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-surface-elevated"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* Cluster cards */}
      {phase === 'ready' && !allResolved ? (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            {pending.length} group{pending.length === 1 ? '' : 's'} found. Review each one and approve or dismiss.
          </p>
          {cards.map((card) => {
            if (card.status === 'dismissed') return null;
            if (card.status === 'approved') return null;
            return (
              <ClusterCardView
                key={card.id}
                card={card}
                onCanonicalChange={(val) => updateCard(card.id, { canonical: val })}
                onApprove={() => void handleApprove(card.id)}
                onDismiss={() => handleDismiss(card.id)}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ─── Cluster card ─────────────────────────────────────────────────────────────

interface CardProps {
  card: ClusterCard;
  onCanonicalChange: (val: string) => void;
  onApprove: () => void;
  onDismiss: () => void;
}

function ClusterCardView({ card, onCanonicalChange, onApprove, onDismiss }: CardProps) {
  const nonCanonical = card.variants.filter(
    (v) => v.toLowerCase() !== card.canonical.toLowerCase()
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Likely duplicates
      </p>

      {/* Variant pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {card.variants.map((v) => (
          <span
            key={v}
            className="inline-flex items-center rounded-full border border-slate-600 bg-surface-elevated px-3 py-1 text-xs text-slate-300"
          >
            {v}
          </span>
        ))}
      </div>

      {/* Canonical name editor */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-slate-400">
          Merge all into this name
        </label>
        <input
          type="text"
          value={card.canonical}
          onChange={(e) => onCanonicalChange(e.target.value)}
          disabled={card.isApplying}
          className="block w-full rounded-md border border-slate-700 bg-surface-elevated px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
        />
        {nonCanonical.length > 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            Will rename: {nonCanonical.map((v) => `"${v}"`).join(', ')}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={card.isApplying || !card.canonical.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {card.isApplying ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
              Applying…
            </>
          ) : (
            'Approve'
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={card.isApplying}
          className="inline-flex rounded-md border border-slate-700 bg-surface px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-surface-elevated disabled:opacity-60"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
