/**
 * Gemini 2.0 Flash-Lite statement parser service
 * Used by both production (server.js) and development (vite.config.ts)
 */

export const EXPENSE_CATEGORIES = [
  'Salary & Income',
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

  const promptText = `Extract all financial transactions and summary balance sheet details from this bank statement, receipt, or invoice document.
For each transaction:
- date: YYYY-MM-DD format (if the year is missing, infer it from the statement header or current context).
- rawDescription: The exact original text as printed on the statement.
- cleanMerchant: The clean, concise merchant or vendor name (e.g. 'FairPrice', 'Grab', 'Amazon', 'Starbucks', 'DBS PayLah!').
- amount: The numeric absolute value (positive float, e.g. 14.50).
- type: One of 'expense' (purchases, debits), 'refund' (returns, credits), 'income' (salary, incoming deposits), or 'transfer' (inter-bank transfer, credit card payment).
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

/**
 * Categorize unknown/foreign transactions and extract regex matching patterns using Gemini 2.0 Flash-Lite
 * @param {Array<{ rawDescription: string, amount?: number, type?: string } | string>} rawItems
 * @returns {Promise<{ categorized: Array<{ rawDescription: string, cleanMerchant: string, category: string, suggestedRegex: string, type: string }>, newRules: Record<string, string> }>}
 */
export async function categorizeUnknownTransactions(rawItems = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set the GEMINI_API_KEY environment variable in Railway (or in your local .env file).'
    );
  }

  // Deduplicate items by normalized raw description
  const uniqueItemsMap = new Map();
  for (const item of rawItems) {
    const raw = typeof item === 'string' ? item : item?.rawDescription || '';
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (!uniqueItemsMap.has(key)) {
      uniqueItemsMap.set(key, {
        rawDescription: trimmed,
        amount: typeof item === 'object' && item?.amount !== undefined ? item.amount : 0,
        type: typeof item === 'object' && item?.type ? item.type : 'expense',
      });
    }
  }

  const uniqueList = Array.from(uniqueItemsMap.values());
  if (uniqueList.length === 0) {
    return { categorized: [], newRules: {} };
  }

  const promptText = `You are a financial transaction categorization assistant.
Analyze these unknown bank statement transactions and determine:
1. cleanMerchant: A readable, clean brand or merchant name (e.g. 'Flower Chimp', 'Singapore Airlines', 'Gojek', 'Monthly Salary').
2. category: The most appropriate category from:
   ${EXPENSE_CATEGORIES.map((c) => `"${c}"`).join(', ')}.
3. suggestedRegex: An uppercase keyword or regex pattern suitable for regex/keyword matching to automatically recognize this merchant in future raw descriptions without calling an AI API (e.g. for "Flower Chimp Me 14MAY 4628", return "FLOWER CHIMP"; for "PAYROLL SALARY MAY", return "SALARY|PAYROLL"). Keep it simple and uppercase.
4. type: One of 'expense', 'income' (salary, payroll, inbound deposits), 'refund' (returns, reversals), or 'transfer' (inter-bank transfer, card payment).

Transactions to categorize:
${JSON.stringify(uniqueList, null, 2)}`;

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
          results: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                rawDescription: { type: 'STRING' },
                cleanMerchant: { type: 'STRING' },
                category: {
                  type: 'STRING',
                  enum: EXPENSE_CATEGORIES,
                },
                suggestedRegex: { type: 'STRING' },
                type: {
                  type: 'STRING',
                  enum: ['expense', 'income', 'refund', 'transfer'],
                },
              },
              required: ['rawDescription', 'cleanMerchant', 'category', 'suggestedRegex', 'type'],
            },
          },
        },
        required: ['results'],
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
  const results = Array.isArray(parsed.results) ? parsed.results : [];

  const categorized = [];
  const newRules = {};

  for (const item of results) {
    const rawDesc = String(item.rawDescription || '').trim();
    const cleanMerchant = String(item.cleanMerchant || rawDesc).trim();
    const category = EXPENSE_CATEGORIES.includes(item.category) ? item.category : 'Uncategorized';
    const type = ['expense', 'income', 'refund', 'transfer'].includes(item.type) ? item.type : 'expense';
    const suggestedRegex = String(item.suggestedRegex || cleanMerchant).trim().toUpperCase();

    categorized.push({
      rawDescription: rawDesc,
      cleanMerchant,
      category,
      suggestedRegex,
      type,
    });

    if (suggestedRegex && category && category !== 'Uncategorized') {
      newRules[suggestedRegex] = category;
    }
  }

  return {
    categorized,
    newRules,
  };
}
