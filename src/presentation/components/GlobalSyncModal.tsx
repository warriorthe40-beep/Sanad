interface Props {
  originalName: string;
  newName: string;
  matchCount: number;
  isApplying: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}

export default function GlobalSyncModal({
  originalName,
  newName,
  matchCount,
  isApplying,
  onConfirm,
  onSkip,
}: Props) {
  const hasOthers = matchCount > 0;
  const plural = matchCount === 1 ? 'purchase' : 'purchases';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gsm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-surface p-6 shadow-2xl">
        <h2 id="gsm-title" className="text-base font-semibold text-slate-100">
          Update store name everywhere?
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          You renamed{' '}
          <span className="font-medium text-slate-200">"{originalName}"</span>{' '}
          to{' '}
          <span className="font-medium text-slate-200">"{newName}"</span>.
        </p>

        <p className="mt-1 text-sm text-slate-400">
          {hasOthers
            ? `Should I also update the other ${matchCount} ${plural} with that store name and remember this correction for future receipts?`
            : 'Should I remember this correction so future receipts are auto-corrected?'}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isApplying ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
                Applying…
              </>
            ) : hasOthers ? (
              `Yes, update all ${matchCount} & remember`
            ) : (
              'Yes, remember it'
            )}
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={isApplying}
            className="inline-flex justify-center rounded-md border border-slate-700 bg-surface px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-surface-elevated disabled:opacity-60"
          >
            No, just this one
          </button>
        </div>
      </div>
    </div>
  );
}
