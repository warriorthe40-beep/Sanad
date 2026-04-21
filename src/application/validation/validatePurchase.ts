import type { Purchase } from '@/data/models';

/**
 * Shape of the data the Add Purchase form hands off for validation. Matches
 * the "required vs. optional" split from system_blueprint.md §3: store,
 * category, price, and date are required; warranty + return window are not.
 */
export type PurchaseDraft = Partial<
  Pick<
    Purchase,
    | 'productName'
    | 'storeName'
    | 'categoryName'
    | 'price'
    | 'purchaseDate'
    | 'warrantyDuration'
    | 'returnWindow'
    | 'notes'
  >
>;

export type PurchaseValidationErrors = Partial<
  Record<keyof PurchaseDraft, string>
>;

export interface PurchaseValidationResult {
  valid: boolean;
  errors: PurchaseValidationErrors;
}

const DURATION_PATTERN = /^\d+\s*(day|week|month|year)s?$/i;

/**
 * Validate a purchase draft before hitting the repository. Step 14 of the
 * Add Purchase sequence diagram ("validate()"). Returns a flat field->message
 * map so the form can render errors inline.
 */
export function validatePurchase(draft: PurchaseDraft): PurchaseValidationResult {
  const errors: PurchaseValidationErrors = {};

  if (!draft.storeName || !draft.storeName.trim()) {
    errors.storeName = 'Store is required.';
  }

  if (!draft.categoryName || !draft.categoryName.trim()) {
    errors.categoryName = 'Category is required.';
  }

  if (draft.price === undefined || draft.price === null || Number.isNaN(draft.price)) {
    errors.price = 'Price is required.';
  } else if (draft.price <= 0) {
    errors.price = 'Price must be greater than 0.';
  }

  if (!draft.purchaseDate || Number.isNaN(draft.purchaseDate.getTime())) {
    errors.purchaseDate = 'Purchase date is required.';
  } else {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (draft.purchaseDate.getTime() > today.getTime()) {
      errors.purchaseDate = 'Purchase date cannot be in the future.';
    }
  }

  if (draft.warrantyDuration && !DURATION_PATTERN.test(draft.warrantyDuration.trim())) {
    errors.warrantyDuration = 'Use a format like "1 year" or "6 months".';
  }

  if (draft.returnWindow && !DURATION_PATTERN.test(draft.returnWindow.trim())) {
    errors.returnWindow = 'Use a format like "14 days" or "1 month".';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
