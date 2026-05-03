import type { ScannedReceiptData } from '@/data/models';
import { createAnthropicClient } from '@/services/anthropic/anthropicClient';

export { MissingApiKeyError } from '@/services/anthropic/anthropicClient';

/**
 * AI receipt scanning, implementing steps 3–5 of the sequence diagram
 * (:ReceiptScanner → :AnthropicAPI).
 *
 * Calls Claude's Vision API with the receipt image (or PDF) and returns
 * a typed `{storeName, amount, date}` payload. If the user hasn't
 * configured an API key, we throw `MissingApiKeyError` — the UI surfaces
 * this as a "add your key in Settings" banner rather than falling back
 * to a mock.
 *
 * We use claude-3-5-sonnet for speed and lower token cost while still
 * supporting vision and text extraction.
 */
const SUPPORTED_IMAGE_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const SUPPORTED_MEDIA_TYPES = new Set([
  ...SUPPORTED_IMAGE_MEDIA_TYPES,
  'application/pdf',
]);

const RECEIPT_EXTRACTION_PROMPT =
  'Extract the store name, total paid, and purchase date from this receipt. ' +
  'Use the total (final amount charged), not any subtotal. ' +
  'If multiple currencies appear, report the amount in the dominant one as a plain number. ' +
  'If you cannot find a field with reasonable confidence, omit it. ' +
  'Return ONLY valid JSON matching this shape: ' +
  '{"storeName":"<string>","amount":<number>,"date":"<YYYY-MM-DD>","confidence":<0-1>}. ' +
  'No explanation, no markdown — just the JSON object.';

function buildPrompt(knownStores?: string[]): string {
  if (!knownStores?.length) return RECEIPT_EXTRACTION_PROMPT;
  const list = knownStores.slice(0, 40).join(', ');
  return (
    RECEIPT_EXTRACTION_PROMPT +
    ` The user's known stores are: [${list}].` +
    ' If the store on this receipt matches one of those names — even across scripts, transliterations, or abbreviations — use that exact known name as storeName.'
  );
}

interface ExtractedReceipt {
  storeName: string;
  amount: number;
  date: string;
  confidence?: number;
}

export async function scanReceipt(
  image: File | Blob,
  knownStores?: string[],
): Promise<ScannedReceiptData> {
  const client = createAnthropicClient();
  const { data, mediaType } = await fileToBase64(image);

  const receiptBlock =
    mediaType === 'application/pdf'
      ? ({
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data,
          },
        } as const)
      : ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data,
          },
        } as const);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          receiptBlock,
          { type: 'text', text: buildPrompt(knownStores) },
        ],
      },
    ],
  });

  return parseReceiptResponse(response.content);
}

export async function scanReceiptText(
  text: string,
  knownStores?: string[],
): Promise<ScannedReceiptData> {
  const client = createAnthropicClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${buildPrompt(knownStores)}\n\nReceipt text:\n${text}`,
          },
        ],
      },
    ],
  });

  return parseReceiptResponse(response.content);
}

function parseReceiptResponse(
  content: Array<{ type: string; text?: string }>
): ScannedReceiptData {
  const textBlock = content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text' || !textBlock.text) {
    throw new Error('Claude returned no text content.');
  }

  let parsed: ExtractedReceipt;
  try {
    parsed = JSON.parse(textBlock.text) as ExtractedReceipt;
  } catch {
    throw new Error('Could not parse the scanner response. Please try again.');
  }

  const date = new Date(parsed.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Scanner returned an unrecognised date: "${parsed.date}".`);
  }

  return {
    storeName: parsed.storeName,
    amount: parsed.amount,
    date,
    confidence: parsed.confidence,
  };
}

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

async function fileToBase64(
  file: File | Blob
): Promise<{ data: string; mediaType: SupportedMediaType }> {
  const rawMediaType = file.type || 'image/jpeg';
  if (!SUPPORTED_MEDIA_TYPES.has(rawMediaType)) {
    throw new Error(
      `Unsupported format "${rawMediaType}". Use JPEG, PNG, GIF, WebP, or PDF.`
    );
  }
  const mediaType = rawMediaType as SupportedMediaType;

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return { data: btoa(binary), mediaType };
}
