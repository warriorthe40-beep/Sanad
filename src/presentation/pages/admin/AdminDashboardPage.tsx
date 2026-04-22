import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  categoryRepository,
  purchaseRepository,
  storePolicyRepository,
  userRepository,
} from '@/data/repositories';
import { useAuth } from '@/auth/context/AuthContext';

interface AdminCounts {
  users: number;
  purchases: number;
  categories: number;
  policies: number;
}

/**
 * AdminDashboardPage — landing screen for admins. Surfaces the four
 * entity counts the Class Diagram's Admin actor can act on, and links
 * to the detail management screens.
 */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      userRepository.getAll(),
      purchaseRepository.getAll(),
      categoryRepository.getAll(),
      storePolicyRepository.getAll(),
    ])
      .then(([users, purchases, categories, policies]) => {
        if (cancelled) return;
        setCounts({
          users: users.length,
          purchases: purchases.length,
          categories: categories.length,
          policies: policies.length,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load counts.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Admin dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {user ? `Signed in as ${user.name}.` : ''} Manage categories, store
          policies, and community data quality.
        </p>
      </header>

      {error ? (
        <p className="mb-6 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Users" value={counts?.users} />
        <StatCard label="Purchases" value={counts?.purchases} />
        <StatCard label="Categories" value={counts?.categories} />
        <StatCard label="Store policies" value={counts?.policies} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LinkCard
          title="Manage categories"
          description="Add, rename, or retire the product categories users pick from when logging purchases."
          to="/admin/categories"
          cta="Open categories"
        />
        <LinkCard
          title="Manage store policies"
          description="Set baseline warranty and return windows per (store, category) pair that seed community suggestions."
          to="/admin/policies"
          cta="Open store policies"
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">
        {value === undefined ? (
          <span className="inline-block h-7 w-10 animate-pulse rounded bg-surface-muted" />
        ) : (
          value
        )}
      </p>
    </div>
  );
}

function LinkCard({
  title,
  description,
  to,
  cta,
}: {
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col justify-between rounded-xl border border-slate-700 bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-100 group-hover:text-brand-hover">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <span className="mt-4 text-sm font-semibold text-brand-hover">{cta} →</span>
    </Link>
  );
}
