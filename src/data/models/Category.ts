/**
 * Category — a product classification (e.g. "Electronics", "Groceries").
 *
 * Relationships:
 *   Category  1 ──*  StorePolicy
 *
 * UML operations (implemented in admin services / category repository):
 *   add(), edit(), delete()
 */
export interface Category {
  id: string;
  name: string;
  /** Icon identifier (e.g. emoji, icon-font key, or svg name). */
  icon: string;
}
