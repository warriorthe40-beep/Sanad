export interface StoreAlias {
  id: string;
  userId: string;
  /** Normalized receipt extraction (lowercase, no special chars). */
  rawName: string;
  /** User's preferred canonical store name. */
  cleanName: string;
}
