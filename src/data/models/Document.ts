import type { DocumentType } from '@/shared/types/common';

/**
 * Document — a photo attached to a Purchase (receipt, warranty card, invoice).
 *
 * Relationships:
 *   Purchase  1 ──0..*  Document  (via purchaseId)
 *
 * UML operations (implemented in the document repository / UI controller):
 *   upload(), delete(), zoom()
 */
export interface Document {
  id: string;
  purchaseId: string;
  /** Base64 data URL or blob reference for the stored image. */
  imageData: string;
  type: DocumentType;
  uploadDate: Date;
}
