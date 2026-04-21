import type { WarrantyStatus } from '@/shared/types/common';

/**
 * Purchase — the core entity. Represents any recorded purchase, warranted or not.
 *
 * Per system_blueprint.md §3, warranty and return-window fields are optional:
 * Sanad works equally well for a 15,000 SAR laptop or a 27 SAR coffee.
 *
 * Relationships:
 *   User      1 ──*  Purchase          (via userId)
 *   Purchase  1 ──0..*  Document       (see Document.purchaseId)
 *   Purchase  1 ──0..*  Alert          (see Alert.purchaseId; only if warranty recorded)
 *   Purchase  1 ──0..1  Claim          (see Claim.purchaseId)
 *   Purchase  * ──1     Store          (via storeName)
 *   Purchase  * ──1     Category       (via categoryName)
 *
 * UML operations (implemented in the purchase repository / application layer):
 *   addPurchase(), quickAdd(), editPurchase(), deletePurchase(),
 *   getWarrantyStatus(), getDaysRemaining()
 */
export interface Purchase {
  id: string;
  /** Required for full Add flow; absent for Quick Add entries. */
  productName?: string;
  storeName: string;
  categoryName: string;
  price: number;
  purchaseDate: Date;
  /** Owning user. */
  userId: string;

  /** Human-readable duration, e.g. `"1 year"`, `"6 months"`. Optional. */
  warrantyDuration?: string;
  /** Computed from purchaseDate + warrantyDuration. Optional. */
  warrantyEndDate?: Date;
  /** Human-readable return window, e.g. `"14 days"`. Optional. */
  returnWindow?: string;
  /** Computed from purchaseDate + returnWindow. Optional. */
  returnEndDate?: Date;
  /** Derived state. Absent when no warranty was recorded. */
  warrantyStatus?: WarrantyStatus;

  /** Free-text notes. Optional. */
  notes?: string;
}
