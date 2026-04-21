import type { StorageAdapter } from '@/data/storage';
import type { User } from '@/data/models';
import { BaseRepository } from './BaseRepository';

const COLLECTION = 'users';

/**
 * UserRepository — persistence for user accounts (both regular users and
 * admins — Admin extends User, and both live in the same collection).
 *
 * Adds `getByEmail` on top of the standard CRUD, since login flows need to
 * look a user up by email address rather than by id.
 */
export class UserRepository extends BaseRepository<User> {
  constructor(adapter: StorageAdapter) {
    super(adapter, COLLECTION);
  }

  /**
   * Find a user by email (case-insensitive). Returns `null` if no account
   * has that email.
   */
  async getByEmail(email: string): Promise<User | null> {
    const needle = email.trim().toLowerCase();
    const users = await this.loadAll();
    return users.find((user) => user.email.toLowerCase() === needle) ?? null;
  }
}
