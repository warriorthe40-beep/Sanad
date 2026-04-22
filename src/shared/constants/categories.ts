/**
 * Default category list for the Add Purchase dropdown. Kept as a plain module
 * constant for the prototype; a later task wires this to `categoryRepository`
 * so admins can edit it (Class Diagram: Admin.manageCategories).
 */
export const DEFAULT_CATEGORIES = [
  'Electronics',
  'Appliances',
  'Furniture',
  'Clothing',
  'Foods',
  'Groceries',
  'Coffee',
  'Beauty',
  'Books',
  'Toys',
  'Sports',
  'Other',
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
