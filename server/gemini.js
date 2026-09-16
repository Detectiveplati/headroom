/**
 * Gemini 2.0 Flash-Lite statement parser service
 * Used by both production (server.js) and development (vite.config.ts)
 */

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport & Petrol',
  'Shopping & E-Commerce',
  'Entertainment & Gaming',
  'Personal Care & Services',
  'Bills & Utilities',
  'Transfer / Payment',
  'Uncategorized',
];

export async function parseStatementWithGemini({ fileBase64, mimeType, fileName }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in Railway (or in your local .env file).'
    );
  }

  if (!fileBase64) {
    throw new Error('No file data provided.');
  }

  // Normalize MIME type
  let resolvedMimeType = mimeType || 'application/pdf';
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) resolvedMimeType = 'application/pdf';
    else if (lower.endsWith('.png')) resolvedMimeType = 'image/png';
    else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) resolvedMimeType = 'image/jpeg';
    else if (lower.endsWith('.webp')) resolvedMimeType = 'image/webp';
    else if (lower.endsWith('.csv')) resolvedMimeType = 'text/plain';
  }

  const promptText = `Extract all financial transactions from this bank statement, receipt, or invoice document.
For each transaction:
- date: YYYY-MM-DD format (if the year is missing, infer it from the statement header or current context).
- rawDescription: The exact original text as printed on the statement.
- cleanMerchant: The clean, concise merchant or vendor name (e.g. 'FairPrice', 'Grab', 'Amazon', 'Starbucks', 'DBS PayLah!').
- amount: The numeric absolute value (positive float, e.g. 14.50).
- type: One of 'expense' (purchases, debits), 'refund' (returns, credits), 'income' (salary, incoming deposits), or 'transfer' (inter-bank transfer, credit card payment).
- category: Select the most accurate category from:
  ${EXPENSE_CATEGORIES.map((c) => `"${c}"`).join(', ')}.

Also extract the account or card name (accountName) and statement period / date (statementDate) if visible on the document.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMimeType,
              data: fileBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          accountName: { type: 'STRING' },
          statementDate: { type: 'STRING' },
          transactions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                date: { type: 'STRING' },
                rawDescription: { type: 'STRING' },
                cleanMerchant: { type: 'STRING' },
                amount: { type: 'NUMBER' },
                type: {
                  type: 'STRING',
                  enum: ['expense', 'refund', 'transfer', 'income'],
                },
                category: {
                  type: 'STRING',
                  enum: EXPENSE_CATEGORIES,
                },
              },
              required: ['date', 'rawDescription', 'cleanMerchant', 'amount', 'type', 'category'],
            },
          },
        },
        required: ['transactions'],
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Gemini API returned status ${response.status}`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error?.message) {
        errorMessage = errJson.error.message;
      }
    } catch {
      // Use fallback
    }
    throw new Error(`AI Statement Extraction failed: ${errorMessage}`);
  }

  const result = await response.json();
  const textPayload = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textPayload) {
    throw new Error('Gemini did not return any structured transaction data.');
  }

  const parsed = JSON.parse(textPayload);
  const rawList = Array.isArray(parsed.transactions) ? parsed.transactions : [];

  const now = Date.now();
  const transactions = rawList.map((item, idx) => ({
    id: `gemini_${now}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    date: String(item.date || new Date().toISOString().slice(0, 10)),
    rawDescription: String(item.rawDescription || 'Transaction'),
    cleanMerchant: String(item.cleanMerchant || item.rawDescription || 'Unknown Merchant'),
    amount: Math.abs(Number(item.amount) || 0),
    type: ['expense', 'refund', 'transfer', 'income'].includes(item.type) ? item.type : 'expense',
    category: EXPENSE_CATEGORIES.includes(item.category) ? item.category : 'Uncategorized',
    accountName: parsed.accountName || undefined,
    reviewed: false,
    createdAt: now,
  }));

  const meta = {
    accountName: parsed.accountName || undefined,
    statementDate: parsed.statementDate || undefined,
  };

  return {
    transactions,
    meta,
  };
}
