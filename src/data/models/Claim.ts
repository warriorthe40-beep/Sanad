import type { ClaimStatus } from '@/shared/types/common';

/**
 * Claim — an issue reported on a purchase with an active warranty.
 *
 * Relationships:
 *   Purchase  1 ──0..1  Claim  (via purchaseId)
 *
 * UML operations (implemented in the claims service / purchase repository):
 *   reportIssue(), updateStatus(), getReceiptAndWarranty()
 */
export interface Claim {
  id: string;
  purchaseId: string;
  description: string;
  /** Base64 data URL or blob reference for an optional damage photo. */
  damagePhoto?: string;
  status: ClaimStatus;
  dateReported: Date;
}
