import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import type { StorePolicy } from '@/data/models';
import { storePolicyRepository } from '@/data/repositories';

interface FormState {
  storeId: string;
  categoryId: string;
  typicalWarranty: string;
  typicalReturnWindow: string;
}

const INITIAL_FORM: FormState = {
  storeId: '',
  categoryId: '',
  typicalWarranty: '',
  typicalReturnWindow: '',
};

/**
 * ManageStorePoliciesPage — admin CRUD on the StorePolicy collection.
 * Implements the UML Admin operation `manageStorePolicies`: creating a
 * new (store, category) baseline, editing typical warranty / return
 * values inline, and removing rows. Report counts are shown read-only
 * since they're driven by community contributions.
 */
export default function ManageStorePoliciesPage() {
  const [policies, setPolicies] = useState<StorePolicy[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FormState>(INITIAL_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    void storePolicyRepository
      .getAll()
      .then((items) => {
        if (cancelled) return;
        setPolicies(sortPolicies(items));
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

  const visible = useMemo(() => {
    if (!policies) return [];
    const needle = filter.trim().toLowerCase();
    if (!needle) return policies;
    return policies.filter((policy) =>
      [policy.storeId, policy.categoryId].some((field) =>
        field.toLowerCase().includes(needle)
      )
    );
  }, [policies, filter]);

  function handleFormChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setCreateError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const storeId = form.storeId.trim();
    const categoryId = form.categoryId.trim();
    if (!storeId || !categoryId) {
      setCreateError('Store and category are required.');
      return;
    }

    const existing = await storePolicyRepository.getByStoreAndCategory(
      storeId,
      categoryId
    );
    if (existing) {
      setCreateError('A policy already exists for that store and category.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await storePolicyRepository.create({
        storeId,
        categoryId,
        typicalWarranty: form.typicalWarranty.trim(),
        typicalReturnWindow: form.typicalReturnWindow.trim(),
        reportCount: 0,
      });
      setPolicies((prev) => sortPolicies([...(prev ?? []), created]));
      setForm(INITIAL_FORM);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create policy.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginEdit(policy: StorePolicy) {
    setEditingId(policy.id);
    setEditDraft({
      storeId: policy.storeId,
      categoryId: policy.categoryId,
      typicalWarranty: policy.typicalWarranty,
      typicalReturnWindow: policy.typicalReturnWindow,
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(INITIAL_FORM);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    const storeId = editDraft.storeId.trim();
    const categoryId = editDraft.categoryId.trim();
    if (!storeId || !categoryId) {
      setEditError('Store and category are required.');
      return;
    }
    try {
      const updated = await storePolicyRepository.update(id, {
        storeId,
        categoryId,
        typicalWarranty: editDraft.typicalWarranty.trim(),
        typicalReturnWindow: editDraft.typicalReturnWindow.trim(),
      });
      if (!updated) return;
      setPolicies((prev) =>
        prev ? sortPolicies(prev.map((p) => (p.id === id ? updated : p))) : prev
      );
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  async function handleDelete(policy: StorePolicy) {
    const confirmed = window.confirm(
      `Delete policy for "${policy.storeId}" / "${policy.categoryId}"?`
    );
    if (!confirmed) return;
    try {
      await storePolicyRepository.delete(policy.id);
      setPolicies((prev) => prev?.filter((p) => p.id !== policy.id) ?? prev);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">
          Manage store policies
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Baseline warranty and return windows per (store, category). These seed
          the community suggestions users see in Add Purchase.
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-700 bg-surface p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-100">Add a policy</h2>
        <form
          onSubmit={handleCreate}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <LabeledInput
            label="Store"
            name="storeId"
            value={form.storeId}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder="e.g. Jarir"
          />
          <LabeledInput
            label="Category"
            name="categoryId"
            value={form.categoryId}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder="e.g. Electronics"
          />
          <LabeledInput
            label="Typical warranty"
            name="typicalWarranty"
            value={form.typicalWarranty}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder='e.g. "1 year"'
          />
          <LabeledInput
            label="Typical return window"
            name="typicalReturnWindow"
            value={form.typicalReturnWindow}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder='e.g. "14 days"'
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
            >
              {isSubmitting ? 'Adding…' : 'Add policy'}
            </button>
            {createError ? (
              <span className="ml-3 text-xs text-rose-600">{createError}</span>
            ) : null}
          </div>
        </form>
      </section>

      <div className="mb-4">
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by store or category"
          className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 sm:max-w-sm"
        />
      </div>

      {loadError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-700 bg-surface">
        {policies === null ? (
          <TableSkeleton />
        ) : policies.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            No policies yet. Add the first one above.
          </p>
        ) : visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">
            Nothing matches that filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-surface-elevated text-left">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Typical warranty</th>
                  <th className="px-4 py-3">Typical return</th>
                  <th className="px-4 py-3">Reports</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((policy) => {
                  const isEditing = editingId === policy.id;
                  if (isEditing) {
                    return (
                      <tr key={policy.id} className="bg-brand-soft/40">
                        <td className="px-4 py-2">
                          <CellInput
                            value={editDraft.storeId}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                storeId: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <CellInput
                            value={editDraft.categoryId}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                categoryId: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <CellInput
                            value={editDraft.typicalWarranty}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                typicalWarranty: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2">
                          <CellInput
                            value={editDraft.typicalReturnWindow}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                typicalReturnWindow: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-500">{policy.reportCount}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(policy.id)}
                              className="inline-flex rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={policy.id}>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {policy.storeId}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{policy.categoryId}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {policy.typicalWarranty || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {policy.typicalReturnWindow || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{policy.reportCount}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => beginEdit(policy)}
                            className="inline-flex rounded-md border border-slate-700 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-surface-elevated"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(policy)}
                            className="inline-flex rounded-md border border-rose-200 bg-surface px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {editError ? (
          <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">
            {editError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function sortPolicies(items: StorePolicy[]): StorePolicy[] {
  return [...items].sort((a, b) => {
    const byStore = a.storeId.localeCompare(b.storeId);
    return byStore !== 0 ? byStore : a.categoryId.localeCompare(b.categoryId);
  });
}

function LabeledInput({
  label,
  name,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="block w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-slate-100 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-surface-elevated"
      />
    </label>
  );
}

function CellInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      className="block w-full rounded-md border border-slate-700 bg-surface px-2 py-1 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
    />
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse bg-surface-elevated/60" />
      ))}
    </div>
  );
}
