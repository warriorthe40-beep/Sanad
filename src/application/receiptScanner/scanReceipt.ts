import type { ScannedReceiptData } from '@/data/models';

/**
 * Mock implementation of the AI receipt-scanning step in the sequence
 * diagram (:ReceiptScanner → :AnthropicAPI). Simulates a 2-second API
 * round trip and returns fake extracted data.
 *
 * Real implementation will live in src/services/anthropic/ and call the
 * Anthropic vision API; this module orchestrates the call, so switching
 * to the real client is a matter of swapping the import.
 *
 * Steps 3–5 of the sequence diagram:
 *   3. scanReceipt(image)
 *   4. extract data from image (Anthropic)
 *   5. return { store, amount, date }
 */
export async function scanReceipt(
  _image: File | Blob | string
): Promise<ScannedReceiptData> {
  await delay(2000);
  return {
    storeName: 'Jarir',
    amount: 4999,
    date: new Date(),
    confidence: 0.92,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
