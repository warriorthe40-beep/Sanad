/**
 * Any entity managed by a repository has a string `id`. The data models
 * already satisfy this constraint.
 */
export interface Entity {
  id: string;
}

/**
 * Repository — the CRUD contract every repository must satisfy.
 *
 * Keeping this abstraction in place (instead of coupling controllers to
 * localStorage) is what makes the "swap to a cloud DB later" requirement
 * from system_blueprint.md §6 achievable without touching consumers.
 *
 * `create` omits `id` because repositories mint ids; `update` takes a
 * partial patch and never lets callers reassign the id.
 */
export interface Repository<T extends Entity> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, patch: Partial<Omit<T, 'id'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
