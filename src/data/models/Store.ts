/**
 * Store — a merchant where purchases are made.
 *
 * Relationships:
 *   Store  1 ──*  StorePolicy  (one policy per category)
 *
 * UML operations (implemented in admin services / store repository):
 *   add(), edit(), delete(), autoSuggestCategory()
 */
export interface Store {
  id: string;
  name: string;
  /** Free-form contact info (phone, website, email). Optional in practice. */
  contactInfo: string;
  location: string;
}
