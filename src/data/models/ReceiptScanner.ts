/**
 * ReceiptScanner — configuration and result shapes for the AI receipt-scanning
 * feature. The runtime implementation lives in the External Services layer
 * (`src/services/anthropic/`) and is orchestrated from
 * `src/application/receiptScanner/`; only the data contracts live here.
 *
 * UML operations (implemented in the receipt-scanner service, not here):
 *   scanReceipt(image), extractData(response), autoFillForm(data)
 */

/** Configuration needed to talk to the external AI vision API. */
export interface ReceiptScannerConfig {
  apiEndpoint: string;
  apiModel: string;
}

/** Structured data extracted from a receipt photo. */
export interface ScannedReceiptData {
  storeName: string;
  /** Total amount detected on the receipt. */
  amount: number;
  /** Detected purchase date. */
  date: Date;
  /**
   * Optional model-reported confidence in [0, 1]. When absent, callers should
   * treat the extraction as unverified and prompt the user to review.
   */
  confidence?: number;
}
