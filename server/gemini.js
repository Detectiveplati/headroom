/**
 * Gemini 2.0 Flash-Lite statement parser service
 * Used by both production (server.js) and development (vite.config.ts)
 */

export const EXPENSE_CATEGORIES = [
  'Salary & Income',
  'Money In',
  'Office Claims',
  'Food & Dining',
  'Groceries',
  'Transport & Petrol',
  'Shopping & E-Commerce',
  'Subscriptions',
  'Entertainment & Gaming',
  'Personal Care & Services',
  'Bills & Utilities',
  'Transfer / Payment',
  'PayNow Transfers',
  'Uncategorized',
];

// Gemini 2.0 Flash-Lite was shut down on June 1, 2026.
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

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

  const promptText = `Extract all financial transactions and summary balance sheet details from this bank statement, receipt, or invoice document.
For each transaction:
- date: YYYY-MM-DD format (if the year is missing, infer it from the statement header or current context).
- rawDescription: The exact original text as printed on the statement.
- cleanMerchant: The clean, concise merchant or vendor name (e.g. 'FairPrice', 'Grab', 'Amazon', 'Starbucks', 'DBS PayLah!').
- amount: The numeric absolute value (positive float, e.g. 14.50).
- type: One of 'expense' (purchases, debits), 'refund' (returns, credits), 'income' (salary, incoming deposits), or 'transfer' (inter-bank transfer, credit card payment).
- For PayNow, use 'PayNow Transfers' and type 'transfer' for a likely person-to-person transfer. If the recipient is clearly a business, categorize the business normally.
- For non-refund incoming deposits, including Incoming PayNow, FAST payments from a person, or government payouts, use 'Money In' and type 'income'.
- Use 'Office Claims' for an expense explicitly identified as an office claim or reimbursement; statement credits for those claims are type 'refund'.
- For a Grab charge that does not explicitly say GrabCar, GrabRide, or Taxi, default to 'Food & Dining'; only clearly identified rides belong in 'Transport & Petrol'.
- Use 'Subscriptions' for recurring streaming, cloud, software, or membership charges (for example Spotify, Netflix, iCloud, Adobe, ChatGPT, or Notion).
- category: Select the most accurate category from:
  ${EXPENSE_CATEGORIES.map((c) => `"${c}"`).join(', ')}.

Also extract:
- accountName: Account or card name/number if visible on the document.
- accountType: 'debit' (for savings, current, multiplier, debit accounts) or 'credit' (for credit cards, loans).
- statementDate: Statement issue date if printed.
- statementPeriod: Statement period (e.g. '2026-03-01 to 2026-03-31').
- openingBalance: Starting / opening balance before transactions (number, positive or negative).
- closingBalance: Ending / closing / ledger balance (number, positive or negative). For credit cards, this is the total outstanding balance / new balance.`;

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
          accountType: { type: 'STRING', enum: ['debit', 'credit'] },
          statementDate: { type: 'STRING' },
          statementPeriod: { type: 'STRING' },
          openingBalance: { type: 'NUMBER' },
          closingBalance: { type: 'NUMBER' },
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
    accountType: parsed.accountType || undefined,
    statementDate: parsed.statementDate || undefined,
    statementPeriod: parsed.statementPeriod || undefined,
    openingBalance: typeof parsed.openingBalance === 'number' ? parsed.openingBalance : undefined,
    closingBalance: typeof parsed.closingBalance === 'number' ? parsed.closingBalance : undefined,
  };

  return {
    transactions,
    meta,
  };
}

const MAX_CATEGORIZATION_BATCH_SIZE = 100;

const CATEGORY_BY_CODE = {
  income: 'Salary & Income',
  moneyin: 'Money In',
  office: 'Office Claims',
  food: 'Food & Dining',
  grocery: 'Groceries',
  transport: 'Transport & Petrol',
  shopping: 'Shopping & E-Commerce',
  subscriptions: 'Subscriptions',
  entertainment: 'Entertainment & Gaming',
  personal: 'Personal Care & Services',
  bills: 'Bills & Utilities',
  transfer: 'Transfer / Payment',
  paynow: 'PayNow Transfers',
  unknown: 'Uncategorized',
};

const TYPE_BY_CODE = {
  e: 'expense',
  i: 'income',
  r: 'refund',
  t: 'transfer',
};

function getCategorizationKey(description) {
  return description
    .toUpperCase()
    .replace(/\b\d{1,2}[A-Z]{3}\b|\b\d{4,}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Categorize a compact batch of unknown transactions and return UI-friendly results.
 * Gemini sees only an ID and representative description; raw descriptions are restored locally.
 * @param {Array<{ rawDescription: string } | string>} rawItems
 * @returns {Promise<{ categorized: Array<{ rawDescription: string, cleanMerchant: string, category: string, suggestedRegex: string, type: string }>, newRules: Record<string, string> }>}
 */
export async function categorizeUnknownTransactions(rawItems = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in Railway (or in your local .env file).'
    );
  }

  if (rawItems.length > MAX_CATEGORIZATION_BATCH_SIZE) {
    throw new Error(`Categorization batches are limited to ${MAX_CATEGORIZATION_BATCH_SIZE} transactions.`);
  }

  // Group harmless statement variants (dates and card/reference numbers) under one AI lookup.
  const uniqueItemsMap = new Map();
  for (const item of rawItems) {
    const raw = typeof item === 'string' ? item : item?.rawDescription || '';
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = getCategorizationKey(trimmed);
    const existing = uniqueItemsMap.get(key);
    if (existing) {
      existing.rawDescriptions.push(trimmed);
    } else {
      uniqueItemsMap.set(key, {
        id: String(uniqueItemsMap.size),
        representativeDescription: trimmed,
        rawDescriptions: [trimmed],
      });
    }
  }

  const uniqueList = Array.from(uniqueItemsMap.values());
  if (uniqueList.length === 0) {
    return { categorized: [], newRules: {} };
  }

  const compactItems = uniqueList.map((item) => [item.id, item.representativeDescription]);
  const promptText = `Classify each bank transaction. Return exactly one result for every input ID.
Fields: i=input ID; m=clean merchant; c=category code; p=uppercase reusable keyword/short regex; t=type code.
Categories: income=Salary & Income, moneyin=Money In (non-refund incoming deposits), office=Office Claims, food=Food & Dining, grocery=Groceries, transport=Transport & Petrol, shopping=Shopping & E-Commerce, subscriptions=Subscriptions, entertainment=Entertainment & Gaming, personal=Personal Care & Services, bills=Bills & Utilities, transfer=Transfer / Payment, paynow=PayNow Transfers, unknown=Uncategorized.
Default ambiguous Grab charges to food; use transport only for GrabCar, GrabRide, or explicitly identified taxi trips.
Types: e=expense, i=income, r=refund, t=transfer. Use unknown when uncertain. Do not include prose.
Input: ${JSON.stringify(compactItems)}`;

  const requestBody = {
    contents: [
      {
        parts: [
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
          r: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                i: { type: 'STRING' },
                m: { type: 'STRING' },
                c: {
                  type: 'STRING',
                  enum: Object.keys(CATEGORY_BY_CODE),
                },
                p: { type: 'STRING' },
                t: {
                  type: 'STRING',
                  enum: Object.keys(TYPE_BY_CODE),
                },
              },
              required: ['i', 'm', 'c', 'p', 't'],
            },
          },
        },
        required: ['r'],
      },
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
      // Fallback
    }
    throw new Error(`Gemini Categorization failed: ${errorMessage}`);
  }

  const result = await response.json();
  const textPayload = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textPayload) {
    throw new Error('Gemini did not return any categorization results.');
  }

  const parsed = JSON.parse(textPayload);
  const results = Array.isArray(parsed.r) ? parsed.r : [];

  const categorized = [];
  const newRules = {};

  for (const item of results) {
    const source = uniqueList.find((sourceItem) => sourceItem.id === String(item.i));
    if (!source) continue;

    const cleanMerchant = String(item.m || source.representativeDescription).trim();
    const category = CATEGORY_BY_CODE[item.c] || 'Uncategorized';
    const type = TYPE_BY_CODE[item.t] || 'expense';
    const suggestedRegex = String(item.p || cleanMerchant).trim().toUpperCase();

    for (const rawDescription of source.rawDescriptions) {
      categorized.push({
        rawDescription,
        cleanMerchant,
        category,
        suggestedRegex,
        type,
      });
    }

    if (suggestedRegex && category && category !== 'Uncategorized') {
      newRules[suggestedRegex] = category;
    }
  }

  return {
    categorized,
    newRules,
  };
}
