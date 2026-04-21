import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import type { Category } from '@/data/models';
import { categoryRepository } from '@/data/repositories';

interface FormState {
  name: string;
  icon: string;
}

const INITIAL_FORM: FormState = { name: '', icon: '' };

/**
 * ManageCategoriesPage — admin CRUD on the Category collection.
 * Implements the UML Admin operation `manageCategories` via
 * CategoryRepository: listing, creating, inline-editing, and deleting.
 */
export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FormState>(INITIAL_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void categoryRepository
      .getAll()
      .then((items) => {
        if (cancelled) return;
        setCategories(sortCategories(items));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load categories.');
        setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleFormChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setCreateError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const name = form.name.trim();
    if (!name) {
      setCreateError('Name is required.');
      return;
    }
    const existing = await categoryRepository.getByName(name);
    if (existing) {
      setCreateError('A category with that name already exists.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await categoryRepository.create({
        name,
        icon: form.icon.trim(),
      });
      setCategories((prev) => sortCategories([...(prev ?? []), created]));
      setForm(INITIAL_FORM);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function beginEdit(category: Category) {
    setEditingId(category.id);
    setEditDraft({ name: category.name, icon: category.icon });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(INITIAL_FORM);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    const name = editDraft.name.trim();
    if (!name) {
      setEditError('Name is required.');
      return;
    }
    const existing = await categoryRepository.getByName(name);
    if (existing && existing.id !== id) {
      setEditError('Another category already uses that name.');
      return;
    }
    try {
      const updated = await categoryRepository.update(id, {
        name,
        icon: editDraft.icon.trim(),
      });
      if (!updated) return;
      setCategories((prev) =>
        prev ? sortCategories(prev.map((c) => (c.id === id ? updated : c))) : prev
      );
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Existing purchases keep their stored category name.`
    );
    if (!confirmed) return;
    try {
      await categoryRepository.delete(category.id);
      setCategories((prev) => prev?.filter((c) => c.id !== category.id) ?? prev);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Manage categories
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Add, rename, or retire the categories users pick from when logging a purchase.
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Add a category</h2>
        <form
          onSubmit={handleCreate}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem_auto]"
        >
          <input
            name="name"
            value={form.name}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder="Name (e.g. Electronics)"
            className={inputClass(false)}
          />
          <input
            name="icon"
            value={form.icon}
            onChange={handleFormChange}
            disabled={isSubmitting}
            placeholder="Icon (emoji or key)"
            className={inputClass(false)}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
          >
            {isSubmitting ? 'Adding…' : 'Add'}
          </button>
        </form>
        {createError ? (
          <p className="mt-2 text-xs text-rose-600">{createError}</p>
        ) : null}
      </section>

      {loadError ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {loadError}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white">
        {categories === null ? (
          <TableSkeleton />
        ) : categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-600">
            No categories yet. Add the first one above.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((category) => {
              const isEditing = editingId === category.id;
              return (
                <li key={category.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                  {isEditing ? (
                    <>
                      <input
                        value={editDraft.name}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className={`${inputClass(false)} sm:flex-1`}
                      />
                      <input
                        value={editDraft.icon}
                        onChange={(event) =>
                          setEditDraft((prev) => ({ ...prev, icon: event.target.value }))
                        }
                        placeholder="Icon"
                        className={`${inputClass(false)} sm:w-40`}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(category.id)}
                          className="inline-flex justify-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-1 items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-lg">
                          {category.icon || '🏷️'}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{category.name}</p>
                          <p className="text-xs text-slate-500">ID: {category.id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(category)}
                          className="inline-flex justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          className="inline-flex justify-center rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
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

function sortCategories(items: Category[]): Category[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function inputClass(hasError: boolean): string {
  const base =
    'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50';
  return `${base} ${
    hasError
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-300 focus:border-brand focus:ring-brand/30'
  }`;
}

function TableSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="h-16 animate-pulse bg-slate-50/60" />
      ))}
    </ul>
  );
}
