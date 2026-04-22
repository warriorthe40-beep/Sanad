import { useEffect, useMemo, useState } from 'react';
import type { StorePolicy } from '@/data/models';
import { storePolicyRepository } from '@/data/repositories';

/**
 * MonitorCommunityPage — blueprint §3.20 "Monitor Community Data".
 *
 * Surfaces the aggregated StorePolicy rows used to power community
 * suggestions and highlights rows whose quality is suspect so an admin
 * can act on them:
 *   - Low confidence        (reportCount <= 1)
 *   - Missing warranty AND return window data
 *   - Conflict              (same store has another policy with a
 *                            different typical warranty for the same
 *                            category — shouldn't happen by construction
 *                            but flagged defensively)
 *
 * The "Flag as incorrect" action removes the offending policy so it
 * stops feeding suggestions; the community can repopulate it from
 * subsequent user contributions.
 */
const LOW_CONFIDENCE_THRESHOLD = 1;
const HIGH_CONFIDENCE_THRESHOLD = 5;

type QualityLevel = 'high' | 'moderate' | 'low';

interface AnnotatedPolicy {
  policy: StorePolicy;
  quality: QualityLevel;
  issues: string[];
}

export default function MonitorCommunityPage() {
  const [policies, setPolicies] = useState<StorePolicy[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'issues'>('issues');

  useEffect(() => {
    let cancelled = false;
    void storePolicyRepository
      .getAll()
      .then((items) => {
        if (!cancelled) setPolicies(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load policies.');
        setPolicies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const annotated = useMemo<AnnotatedPolicy[]>(() => {
    if (!policies) return [];
    const byStoreCategory = new Map<string, StorePolicy[]>();
    for (const policy of policies) {
      const key = `${policy.storeId}::${policy.categoryId}`;
      const bucket = byStoreCategory.get(key);
      if (bucket) bucket.push(policy);
      else byStoreCategory.set(key, [policy]);
    }

    return policies
      .map((policy) => {
        const issues: string[] = [];
        if (policy.reportCount <= LOW_CONFIDENCE_THRESHOLD) {
          issues.push('Low confidence');
        }
        if (!policy.typicalWarranty && !policy.typicalReturnWindow) {
          issues.push('Missing data');
        }
        const siblings =
          byStoreCategory.get(`${policy.storeId}::${policy.categoryId}`) ?? [];
        if (siblings.length > 1) {
          const warranties = new Set(siblings.map((s) => s.typicalWarranty));
          if (warranties.size > 1) issues.push('Conflicts with another entry');
        }

        const quality: QualityLevel =
          policy.reportCount >= HIGH_CONFIDENCE_THRESHOLD
            ? 'high'
            : policy.reportCount <= LOW_CONFIDENCE_THRESHOLD
              ? 'low'
              : 'moderate';

        return { policy, quality, issues };
      })
      .sort((a, b) => {
        if (a.issues.length !== b.issues.length) {
          return b.issues.length - a.issues.length;
        }
        return a.policy.reportCount - b.policy.reportCount;
      });
  }, [policies]);

  const visible = useMemo(() => {
    if (filter === 'all') return annotated;
    return annotated.filter((entry) => entry.issues.length > 0);
  }, [annotated, filter]);

  const summary = useMemo(() => {
    const total = annotated.length;
    const flagged = annotated.filter((entry) => entry.issues.length > 0).length;
    const storeCount = new Set(annotated.map((entry) => entry.policy.storeId)).size;
    const avgReports =
      total === 0
        ? 0
        : Math.round(
            (annotated.reduce((sum, entry) => sum + entry.policy.reportCount, 0) /
              total) *
              10
          ) / 10;
    return { total, flagged, storeCount, avgReports };
  }, [annotated]);

  async function handleFlag(policy: StorePolicy) {
    const confirmed = window.confirm(
      `Remove the ${policy.storeId} · ${policy.categoryId} entry? Suggestions will stop using this policy.`
    );
    if (!confirmed) return;
    setFlaggingId(policy.id);
    setFlagError(null);
    try {
      await storePolicyRepository.delete(policy.id);
      setPolicies((prev) =>
        prev ? prev.filter((item) => item.id !== policy.id) : prev
      );
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : 'Could not flag policy.');
    } finally {
      setFlaggingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Monitor community data
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review the community-sourced warranty and return-window data behind
          Add Purchase suggestions. Flag rows that look wrong so they stop
          influencing future suggestions.
        </p>
      </header>

      {loadError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Policies" value={summary.total} tone="slate" />
        <StatCard label="Flagged" value={summary.flagged} tone="amber" />
        <StatCard label="Stores covered" value={summary.storeCount} tone="sky" />
        <StatCard label="Avg reports" value={summary.avgReports} tone="emerald" />
      </section>

      <div className="mb-4 inline-flex overflow-hidden rounded-md border border-slate-700 bg-surface text-sm">
        <FilterButton active={filter === 'issues'} onClick={() => setFilter('issues')}>
          Needs attention
        </FilterButton>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterButton>
      </div>

      {flagError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {flagError}
        </p>
      ) : null}

      {policies === null ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <li
              key={index}
              className="h-24 animate-pulse rounded-xl border border-slate-700 bg-surface-elevated"
            />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-surface p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-100">
            {filter === 'issues'
              ? 'Nothing to flag'
              : 'No community policies yet'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {filter === 'issues'
              ? 'Every policy has enough reports and complete data. Switch to All to browse the full list.'
              : 'Policies are created automatically as users add purchases with warranty or return info.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((entry) => (
            <li key={entry.policy.id}>
              <PolicyCard
                entry={entry}
                isFlagging={flaggingId === entry.policy.id}
                onFlag={() => handleFlag(entry.policy)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PolicyCard({
  entry,
  isFlagging,
  onFlag,
}: {
  entry: AnnotatedPolicy;
  isFlagging: boolean;
  onFlag: () => void;
}) {
  const { policy, quality, issues } = entry;
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <QualityChip quality={quality} reportCount={policy.reportCount} />
            {issues.map((issue) => (
              <IssueChip key={issue} label={issue} />
            ))}
          </div>
          <p className="mt-1 text-base font-semibold text-slate-100">
            {policy.storeId} · {policy.categoryId}
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-3">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Warranty
              </dt>
              <dd className="mt-0.5 text-slate-200">
                {policy.typicalWarranty || <span className="text-slate-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Return
              </dt>
              <dd className="mt-0.5 text-slate-200">
                {policy.typicalReturnWindow || (
                  <span className="text-slate-400">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-500">
                Reports
              </dt>
              <dd className="mt-0.5 text-slate-200">{policy.reportCount}</dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 items-start">
          <button
            type="button"
            onClick={onFlag}
            disabled={isFlagging}
            className="inline-flex justify-center rounded-md border border-rose-200 bg-surface px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {isFlagging ? 'Flagging…' : 'Flag as incorrect'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QualityChip({
  quality,
  reportCount,
}: {
  quality: QualityLevel;
  reportCount: number;
}) {
  const palette: Record<QualityLevel, { label: string; className: string }> = {
    high: { label: 'High confidence', className: 'bg-emerald-100 text-emerald-800' },
    moderate: { label: 'Moderate', className: 'bg-sky-100 text-sky-800' },
    low: { label: 'Low confidence', className: 'bg-amber-100 text-amber-800' },
  };
  const entry = palette[quality];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${entry.className}`}
    >
      {entry.label}
      <span className="rounded-full bg-surface/60 px-1.5 text-[10px] font-medium">
        {reportCount}
      </span>
    </span>
  );
}

function IssueChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'slate' | 'amber' | 'sky' | 'emerald';
}) {
  const palette: Record<typeof tone, string> = {
    slate: 'border-slate-700 bg-surface text-slate-100',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    sky: 'border-sky-200 bg-sky-50 text-sky-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={`rounded-xl border p-4 ${palette[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 font-medium transition ${
        active ? 'bg-brand text-white' : 'text-slate-300 hover:bg-surface-elevated'
      }`}
    >
      {children}
    </button>
  );
}
