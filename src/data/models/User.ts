import type { Role } from '@/shared/types/common';

/**
 * User — the base account for anyone using Sanad.
 *
 * UML operations (implemented in auth/services & user repository, not here):
 *   register(), login(), updateProfile()
 */
export interface User {
  id: string;
  name: string;
  email: string;
  /** Hashed password. Never store plaintext. */
  password: string;
  role: Role;
}

/**
 * Admin — a specialization of User with elevated privileges.
 *
 * Generalization in the class diagram: Admin ▷ User.
 *
 * UML operations (implemented in admin services, not here):
 *   manageCategories(), manageStorePolicies(), monitorCommunityData(), flagOutlier()
 */
export interface Admin extends User {
  role: 'admin';
  /** e.g. `"super"`, `"moderator"` — platform-defined tiers. */
  adminLevel: string;
}
