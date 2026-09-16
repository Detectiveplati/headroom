import { Transaction, TransactionType, ExpenseCategory, CardMetaInfo } from '../types';

// Standard RFC 4180 CSV line parser handling quotes, escaped quotes, and commas
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Convert "14 Sep 2026" or "14/09/2026" or "2026-09-14" to YYYY-MM-DD
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Handle "14 Sep 2026"
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dmyMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const day = dmyMatch[1].padStart(2, '0');
    const month = months[dmyMatch[2].toLowerCase()] || '01';
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle "14/09/2026" or "14-09-2026"
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

// Clean raw cryptic merchant names
export function cleanMerchantName(raw: string): string {
  const upper = raw.toUpperCase().trim();

  // Grab
  if (upper.startsWith('GRAB*') || upper.startsWith('GRAB *')) {
    return 'Grab';
  }

  // Common Singapore Food & Beverage
  if (upper.includes('LUCKIN COFFEE')) return 'Luckin Coffee';
  if (upper.includes('WINGSTOP')) return 'Wingstop';
  if (upper.includes('LONG JOHN SILVER')) return 'Long John Silver\'s';
  if (upper.includes('MCDONALD')) return 'McDonald\'s';
  if (upper.includes('KFC')) return 'KFC';
  if (upper.includes('SHAKE SHACK')) return 'Shake Shack';
  if (upper.includes('JOLLIBEE')) return 'Jollibee';
  if (upper.includes('GENKI SUSHI')) return 'Genki Sushi';
  if (upper.includes('SUSHIRO')) return 'Sushiro';
  if (upper.includes('SONG FA')) return 'Song Fa Bak Kut Teh';
  if (upper.includes('LLAO LLAO')) return 'llaollao';
  if (upper.includes('KOPIFELLAS')) return 'Kopifellas';
  if (upper.includes('BINGXUE')) return 'Bingxue Ice Cream & Tea';
  if (upper.includes('BREADTALK')) return 'BreadTalk';
  if (upper.includes('MONSTER CHILI')) return 'Monster Chili';
  if (upper.includes('STUFF\'D')) return 'Stuff\'d';
  if (upper.includes('TIAN TIAN HAINANESE')) return 'Tian Tian Hainanese Chicken Rice';
  if (upper.includes('SHABU SAI')) return 'Shabu Sai';
  if (upper.includes('COCOLUSH')) return 'Cocolush';
  if (upper.includes('YES LEMON')) return 'Yes Lemon';
  if (upper.includes('SUPERGREEN')) return 'Supergreen';
  if (upper.includes('BEE CHENG HIANG')) return 'Bee Cheng Hiang';
  if (upper.includes('KOUFU')) return 'Koufu';
  if (upper.includes('KOPITIAM')) return 'Kopitiam';
  if (upper.includes('FAIRPRICE GROUP HAWKER')) return 'FairPrice Hawker Centre';
  if (upper.includes('HAWKERS STREET')) return 'Hawkers\' Street';

  // Supermarkets / Groceries
  if (upper.includes('GIANT SUPER') || upper.includes('GIANT-')) return 'Giant Supermarket';
  if (upper.includes('FAIRPRICE') || upper.includes('NTUC FP')) return 'NTUC FairPrice';
  if (upper.includes('COLD STORAGE')) return 'Cold Storage';
  if (upper.includes('SHENG SIONG')) return 'Sheng Siong';
  if (upper.includes('DON DON DONKI')) return 'Don Don Donki';
  if (upper.includes('FRESHDURIAN')) return 'Fresh Durian SG';

  // Transport & Fuel
  if (upper.includes('BUS/MRT')) return 'SimplyGo Bus/MRT';
  if (upper.includes('SPC TAMPINES') || upper.startsWith('SPC ')) return 'SPC Petrol';
  if (upper.includes('SHELL')) return 'Shell Petrol';
  if (upper.includes('ESSO')) return 'Esso Petrol';
  if (upper.includes('CALTEX')) return 'Caltex Petrol';
  if (upper.includes('VICOM')) return 'Vicom Vehicle Inspection';

  // Shopping & E-Commerce
  if (upper.includes('SHOPEE')) return 'Shopee';
  if (upper.includes('LAZADA')) return 'Lazada';
  if (upper.includes('TAOBAO')) return 'Taobao';
  if (upper.includes('TIKTOK SHOP')) return 'TikTok Shop';
  if (upper.includes('DAISO')) return 'Daiso Japan';
  if (upper.includes('TOYOGO')) return 'Toyogo Supermart';
  if (upper.includes('HM SG') || upper.includes('H&M')) return 'H&M';

  // Digital, Entertainment & Tech
  if (upper.includes('STEAMGAMES')) return 'Steam Games';
  if (upper.includes('ELEVENLABS')) return 'ElevenLabs AI';
  if (upper.includes('ARCADE PLANET')) return 'Arcade Planet';
  if (upper.includes('AOOCCI')) return 'Aoocci Auto Tech';
  if (upper.includes('WEIXIN*PANDUO') || upper.includes('WECHAT')) return 'WeChat / Panduo';

  // Personal Care & Services
  if (upper.includes('URBANCOMPANY') || upper.includes('URBAN COMPANY')) return 'Urban Company';
  if (upper.includes('SNIP AVENUE')) return 'Snip Avenue';

  // Bill payment
  if (upper.includes('BILL PAYMENT')) return 'DBS Credit Card Bill Payment';

  // Clean generic suffixes
  let cleaned = raw
    .replace(/\b(SINGAPORE|SGP|SIN|PTE LTD|LLC|INC|CO|CORP|DEPT)\b/gi, '')
    .replace(/\b\d{5,6}\b/g, '') // remove postal codes
    .replace(/\s+/g, ' ')
    .trim();

  // If mostly uppercase, title-case it nicely
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 2) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return cleaned || raw;
}

// Auto-categorize based on description, amounts, and user-defined custom rules
export function categorizeTransaction(
  rawDesc: string,
  debit: number,
  credit: number,
  customRules: Record<string, ExpenseCategory> = {}
): {
  cleanMerchant: string;
  category: ExpenseCategory;
  type: TransactionType;
  amount: number;
} {
  const upper = rawDesc.toUpperCase();
  const cleanName = cleanMerchantName(rawDesc);

  // Check custom user memory rules first
  for (const [pattern, savedCategory] of Object.entries(customRules)) {
    if (upper.includes(pattern.toUpperCase()) || cleanName.toLowerCase().includes(pattern.toLowerCase())) {
      const type: TransactionType = credit > 0 && debit === 0 ? 'refund' : 'expense';
      return {
        cleanMerchant: cleanName,
        category: savedCategory,
        type,
        amount: debit > 0 ? debit : credit,
      };
    }
  }

  // 1. Credit Card Bill Payment or Bank Transfer (exclude from spend & income metrics)
  if (
    upper.includes('BILL PAYMENT') ||
    upper.includes('CARD PAYMENT') ||
    upper.includes('GIRO - DBS') ||
    upper.includes('PAYMENT - DBS')
  ) {
    return {
      cleanMerchant: cleanName,
      category: 'Transfer / Payment',
      type: 'transfer',
      amount: credit > 0 ? credit : debit,
    };
  }

  // 2. Refunds & Credits
  if (credit > 0 && debit === 0) {
    let cat: ExpenseCategory = 'Shopping & E-Commerce';
    if (/GRAB|TAXI|COMFORT/.test(upper)) cat = 'Transport & Petrol';
    if (/URBANCOMPANY/.test(upper)) cat = 'Personal Care & Services';
    return {
      cleanMerchant: cleanName,
      category: cat,
      type: 'refund',
      amount: credit,
    };
  }

  const amount = debit > 0 ? debit : credit;

  // 3. Supermarkets / Groceries
  if (
    /GIANT|FAIRPRICE|NTUC FP|COLD STORAGE|SHENG SIONG|DON DON DONKI|MARKETPLACE|FRESHDURIAN|REDMART/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Groceries', type: 'expense', amount };
  }

  // 4. Food & Dining
  if (
    /LUCKIN|WINGSTOP|LONG JOHN|MCDONALD|KFC|SHAKE SHACK|JOLLIBEE|GENKI|SUSHIRO|SONG FA|LLAO LLAO|KOPIFELLAS|BINGXUE|BREADTALK|MONSTER CHILI|STUFF'D|TIAN TIAN|SHABU SAI|COCOLUSH|YES LEMON|SUPERGREEN|BEE CHENG|KOUFU|KOPITIAM|HAWKER|RESTAURANT|CAFE|BAKERY|COFFEE|TEA|PIZZA|BURGER|NOODLE|RICE/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Food & Dining', type: 'expense', amount };
  }

  // 5. Transport & Petrol
  if (
    /GRAB\*|BUS\/MRT|TRANSIT|SIMPLYGO|SPC |SHELL|ESSO|CALTEX|SINOPEC|PETROL|VICOM|TAXI|GOJEK|COMFORTDELGRO|TADA/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Transport & Petrol', type: 'expense', amount };
  }

  // 6. Entertainment & Digital
  if (
    /STEAMGAMES|STEAM|PLAYSTATION|NINTENDO|XBOX|ARCADE PLANET|ELEVENLABS|SPOTIFY|NETFLIX|YOUTUBE|DISNEY|APPLE\.COM\/BILL|GOOGLE \*|OPENAI|ANTHROPIC/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Entertainment & Gaming', type: 'expense', amount };
  }

  // 7. Shopping & E-Commerce
  if (
    /SHOPEE|LAZADA|TAOBAO|TIKTOK SHOP|DAISO|TOYOGO|H&M|HM SG|ZARA|UNIQLO|AMAZON|ALIEXPRESS|SEPHORA|WATSONS|GUARDIAN|IKEA/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Shopping & E-Commerce', type: 'expense', amount };
  }

  // 8. Personal Care & Services
  if (
    /URBANCOMPANY|URBAN COMPANY|SNIP AVENUE|SALON|HAIR|BARBER|SPA|MASSAGE|CLINIC|DENTAL|HOSPITAL/.test(
      upper
    )
  ) {
    return { cleanMerchant: cleanName, category: 'Personal Care & Services', type: 'expense', amount };
  }

  // 9. Bills & Utilities
  if (/SP SERVICES|SINGTEL|STARHUB|M1|SIMBA|TOWNGAS|MYREPUBLIC/.test(upper)) {
    return { cleanMerchant: cleanName, category: 'Bills & Utilities', type: 'expense', amount };
  }

  return { cleanMerchant: cleanName, category: 'Uncategorized', type: 'expense', amount };
}

export interface ParseResult {
  transactions: Transaction[];
  meta: CardMetaInfo;
  rawRowCount: number;
  duplicateCount: number;
}

// Generate unique transaction signature for duplicate checking
export function getTransactionSignature(t: { date: string; amount: number; rawDescription: string }): string {
  const normDate = normalizeDate(t.date);
  const normAmount = Number(t.amount).toFixed(2);
  const normDesc = t.rawDescription.trim().toLowerCase();
  return `${normDate}|${normAmount}|${normDesc}`;
}

// Main parser function taking raw CSV text and existing transactions
export function parseBankStatementCsv(
  csvText: string,
  existingTransactions: Transaction[] = [],
  customRules: Record<string, ExpenseCategory> = {}
): ParseResult {
  const rows = parseCsvRows(csvText);
  const meta: CardMetaInfo = {};

  // Existing signatures set for quick duplicate lookup
  const existingSignatures = new Set(existingTransactions.map((t) => getTransactionSignature(t)));

  let headerRowIndex = -1;
  let dateCol = -1;
  let postDateCol = -1;
  let descCol = -1;
  let paymentTypeCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  // 1. Scan first 15 rows for metadata and table header
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    const joined = row.join(' ').toLowerCase();

    // DBS / POSB Card metadata
    if (joined.includes('card transaction details for') && row[1]) {
      meta.accountName = row[1];
    } else if (joined.includes('transactions as at') && row[1]) {
      meta.statementDate = row[1];
    } else if (joined.includes('credit limit') && row[1]) {
      const numMatch = row[1].match(/[\d,.]+/);
      if (numMatch) meta.creditLimit = parseFloat(numMatch[0].replace(/,/g, ''));
    } else if (joined.includes('available limit') && row[1]) {
      const numMatch = row[1].match(/[\d,.]+/);
      if (numMatch) meta.availableLimit = parseFloat(numMatch[0].replace(/,/g, ''));
    }

    // Detect header row
    const lowerRow = row.map((c) => c.toLowerCase());
    const foundDate = lowerRow.findIndex((c) => c === 'transaction date' || c === 'date');
    const foundDesc = lowerRow.findIndex(
      (c) => c === 'transaction description' || c === 'description' || c === 'details'
    );

    if (foundDate !== -1 && foundDesc !== -1) {
      headerRowIndex = i;
      dateCol = foundDate;
      descCol = foundDesc;
      postDateCol = lowerRow.findIndex((c) => c.includes('posting date'));
      paymentTypeCol = lowerRow.findIndex((c) => c.includes('payment type'));
      debitCol = lowerRow.findIndex((c) => c.includes('debit') || c.includes('withdrawal'));
      creditCol = lowerRow.findIndex((c) => c.includes('credit') || c.includes('deposit'));

      // If generic single amount column
      if (debitCol === -1 && creditCol === -1) {
        debitCol = lowerRow.findIndex((c) => c.includes('amount'));
      }
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: assume first row is header
    headerRowIndex = 0;
    dateCol = 0;
    descCol = 2;
    debitCol = 6;
    creditCol = 7;
  }

  const transactions: Transaction[] = [];
  let duplicateCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = row[dateCol] || '';
    const rawPostingDate = postDateCol !== -1 ? row[postDateCol] : undefined;
    const rawDesc = row[descCol] || '';
    if (!rawDate && !rawDesc) continue;

    const rawDebitStr = (debitCol !== -1 ? row[debitCol] : '') || '';
    const rawCreditStr = (creditCol !== -1 ? row[creditCol] : '') || '';

    const debit = parseFloat(rawDebitStr.replace(/[$,]/g, '')) || 0;
    const credit = parseFloat(rawCreditStr.replace(/[$,]/g, '')) || 0;

    if (debit === 0 && credit === 0) continue;

    const paymentType = paymentTypeCol !== -1 ? row[paymentTypeCol] : undefined;
    const normalizedDate = normalizeDate(rawDate);

    const { cleanMerchant, category, type, amount } = categorizeTransaction(
      rawDesc,
      debit,
      credit,
      customRules
    );

    const sig = `${normalizedDate}|${amount.toFixed(2)}|${rawDesc.trim().toLowerCase()}`;
    const isDuplicate = existingSignatures.has(sig);

    if (isDuplicate) {
      duplicateCount++;
    }

    const tx: Transaction = {
      id: `tx_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
      date: normalizedDate,
      postingDate: rawPostingDate ? normalizeDate(rawPostingDate) : undefined,
      rawDescription: rawDesc,
      cleanMerchant,
      amount,
      type,
      category,
      paymentType,
      accountName: meta.accountName || 'DBS Credit Card',
      reviewed: false,
      createdAt: Date.now(),
    };

    transactions.push(tx);
  }

  return {
    transactions,
    meta,
    rawRowCount: rows.length,
    duplicateCount,
  };
}
