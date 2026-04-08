import { Injectable } from '@angular/core';

export interface ScannedReceiptData {
  merchantName:     string;
  merchantPhone?:   string;
  merchantAddress?: string;
  merchantEmail?:   string;
  merchantContact?: string;
  expenseName:      string;
  description:      string;      // All line items formatted as a readable list
  amount:           number | null; // Grand total (tax-inclusive)
  subTotal:         number | null; // Pre-tax subtotal if found
  taxAmount:        number | null; // Tax monetary value if found
  taxRate:          number | null; // Tax percentage if found (e.g. 7.5)
  taxLabel:         string;        // Tax label found on receipt (e.g. "VAT", "GST")
  quantity:         number | null; // Total number of distinct line items
  date:             string;        // YYYY-MM-DD
  lineItems:        ScannedLineItem[];
  confidence:       'high' | 'medium' | 'low';
  rawText:          string;
  warnings:         string[];
}

export interface ScannedLineItem {
  qty:   number;
  name:  string;
  price: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORD MAPS
// ─────────────────────────────────────────────────────────────────────────────

const TOTAL_KEYWORDS = [
  /\bgrand\s+total\b/i,
  /\btotal\s+amount\b/i,
  /\bamount\s+due\b/i,
  /\bbalance\s+due\b/i,
  /\btotal\s+due\b/i,
  /\bamt\s+due\b/i,
  /\bnet\s+total\b/i,
  /\btotal\b/i,
];

const SUBTOTAL_KEYWORDS = [
  /\bsub[\s-]?total\b/i,
  /\bsubtotal\b/i,
  /\bnet\s+amount\b/i,
  /\bexcl\.?\s+tax\b/i,
];

const TAX_KEYWORDS = [
  /\bv\.?a\.?t\.?\b/i,
  /\bvalue\s+added\s+tax\b/i,
  /\bg\.?s\.?t\.?\b/i,
  /\bsales\s+tax\b/i,
  /\bservice\s+charge\b/i,
  /\btax\b/i,
];

const FOOTER_KEYWORDS = [
  /\bsub[\s-]?total\b/i,
  /\btotal\b/i,
  /\bbalance\b/i,
  /\bchange\b/i,
  /\bthank\b/i,
  /\bwelcome\b/i,
  /\bplease\s+come\b/i,
  /\bwww\./i,
  /\bcashier\b/i,
  /\bserver\b/i,
  /\bserved\s+by\b/i,
  /\breceipt\s+no/i,
  /\btransaction\b/i,
];

@Injectable({ providedIn: 'root' })
export class ReceiptScannerService {



  async scanImage(file: File): Promise<ScannedReceiptData> {
    const Tesseract = await import('tesseract.js');
    const result = await Tesseract.recognize(file, 'eng', {});
    const rawText = result.data.text;
    console.log('[ReceiptScanner] Raw OCR text:\n', rawText);
    return this._parseReceiptText(rawText);
  }

  async scanFromDataUrl(dataUrl: string): Promise<ScannedReceiptData> {
    const Tesseract = await import('tesseract.js');
    const result    = await Tesseract.recognize(dataUrl, 'eng', {});
    return this._parseReceiptText(result.data.text);
  }


  private _parseReceiptText(raw: string): ScannedReceiptData {
    const warnings: string[] = [];

    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 1);

    const merchantName    = this._extractMerchant(lines);
    const merchantPhone   = this._extractMerchantPhone(lines);
    const merchantAddress = this._extractMerchantAddress(lines, merchantName);
    const merchantContact = this._extractMerchantContact(lines);

    const date = this._extractDate(raw);
    if (!date) warnings.push('Transaction date could not be detected.');

    // ✅ Pass raw text as well for fallback extraction
    const { total, subTotal, taxAmount, taxRate, taxLabel } = this._extractFinancials(lines, raw);

    if (total === null) warnings.push('Total amount could not be detected. Please enter manually.');
    if (taxAmount === null && taxRate === null) warnings.push('Tax could not be detected.');

    const lineItems = this._extractLineItems(lines, merchantName);
    if (!lineItems.length) warnings.push('Individual line items could not be parsed.');

    const quantity = lineItems.length > 0 ? lineItems.length : null;

    const description = lineItems.length > 0
      ? lineItems.map(i => `${i.qty}x  ${i.name}  —  ₦${i.price.toLocaleString()}`).join('\n')
      : '';

    const fieldsFound = [merchantName, date, total].filter(Boolean).length;
    const confidence: 'high' | 'medium' | 'low' =
      fieldsFound === 3 ? 'high' :
      fieldsFound === 2 ? 'medium' : 'low';

    return {
      merchantName,
      merchantPhone,
      merchantAddress,
      merchantEmail:   '',
      merchantContact,
      expenseName:     merchantName || (lines[0] || ''),
      description,
      amount:          total,
      subTotal,
      taxAmount,
      taxRate,
      taxLabel,
      quantity,
      date,
      lineItems,
      confidence,
      rawText:         raw,
      warnings,
    };
  }


  private _extractFinancials(lines: string[], rawText: string): {
    total:     number | null;
    subTotal:  number | null;
    taxAmount: number | null;
    taxRate:   number | null;
    taxLabel:  string;
  } {
    let total:     number | null = null;
    let subTotal:  number | null = null;
    let taxAmount: number | null = null;
    let taxRate:   number | null = null;
    let taxLabel:  string        = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── Tax line ─────────────────────────────────────────────────────────
      if (TAX_KEYWORDS.some(kw => kw.test(line)) &&
          !SUBTOTAL_KEYWORDS.some(kw => kw.test(line))) {

        const pctMatch = line.match(/(\d+(?:\.\d{1,2})?)\s*%/);
        if (pctMatch) taxRate = parseFloat(pctMatch[1]);

        const lineWithoutPct = line.replace(/\d+(?:\.\d{1,2})?\s*%/, '');
        const moneyOnLine    = this._extractNumber(lineWithoutPct);
        if (moneyOnLine !== null && moneyOnLine > 0) {
          taxAmount = moneyOnLine;
        } else if (i + 1 < lines.length) {
          const moneyNextLine = this._extractNumber(lines[i + 1]);
          if (moneyNextLine !== null && moneyNextLine > 0) taxAmount = moneyNextLine;
        }

        const labelMatch = line.match(
          /\b(v\.?a\.?t\.?|g\.?s\.?t\.?|sales\s+tax|service\s+charge|tax)\b/i
        );
        if (labelMatch && !taxLabel) {
          taxLabel = labelMatch[1].replace(/\./g, '').toUpperCase();
        }

        console.log(`[ReceiptScanner] Tax → label:${taxLabel} rate:${taxRate}% amount:${taxAmount}`);
        continue;
      }

      // ── Subtotal line ─────────────────────────────────────────────────────
      if (SUBTOTAL_KEYWORDS.some(kw => kw.test(line))) {
        const n = this._extractNumber(line) ??
          (i + 1 < lines.length ? this._extractNumber(lines[i + 1]) : null);
        if (n !== null && n > 0) {
          subTotal = n;
          console.log(`[ReceiptScanner] Subtotal: ${subTotal}`);
        }
        continue;
      }

      // ── Total line ────────────────────────────────────────────────────────
      if (TOTAL_KEYWORDS.some(kw => kw.test(line)) &&
          !SUBTOTAL_KEYWORDS.some(kw => kw.test(line))) {
        const n = this._extractNumber(line) ??
          (i + 1 < lines.length ? this._extractNumber(lines[i + 1]) : null);
        if (n !== null && n > 0) {
          total = n;
          console.log(`[ReceiptScanner] Total candidate: ${total} from "${line}"`);
        }
      }
    }

    // Fallback loop (similar to first version)
    if (total === null) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\btotal\b/i.test(line) && !SUBTOTAL_KEYWORDS.some(kw => kw.test(line))) {
          const n = this._extractNumber(line) ??
            (i + 1 < lines.length ? this._extractNumber(lines[i + 1]) : null);
          if (n !== null && n > 0) {
            total = n;
            console.log(`[ReceiptScanner] Total fallback: ${total} from "${line}"`);
            break;
          }
        }
      }
    }

    // ✅ RAW TEXT FALLBACK (restored from first version)
    if (total === null) {
      const rawMatch = rawText.match(/total[^\d\n]*([=₦$£€\s]*[\d,\.]+)/i);
      if (rawMatch) {
        const fallback = this._extractNumber(rawMatch[1]);
        if (fallback !== null && fallback > 0) {
          total = fallback;
          console.log(`[ReceiptScanner] Total via raw-text fallback: ${total}`);
        }
      }
    }

    // Derive missing values
    if (taxAmount === null && subTotal !== null && taxRate !== null) {
      taxAmount = Math.round(subTotal * taxRate / 100 * 100) / 100;
    }
    if (total === null && subTotal !== null && taxAmount !== null) {
      total = subTotal + taxAmount;
    }

    return { total, subTotal, taxAmount, taxRate, taxLabel };
  }

 
  private _extractMerchant(lines: string[]): string {
    const skipPatterns = [
      /^\d{2}[-/]\d{2}[-/]\d{4}/,
      /^(\+?234|0)[\d\s-]{9,}/,
      /^\d{5,}/,
      /^(receipt|invoice|tax\s*invoice|check|table|order)/i,
      /^(address|tel|phone|email|web|www|http)/i,
      /^(sub.?total|total|grand|amount|due|balance|vat|tax)/i,
      /^(thank|welcome|cashier|server|served)/i,
      /[/\\@]/,
    ];

    const isAllCaps = (s: string) =>
      s === s.toUpperCase() && /[A-Z]{2,}/.test(s) && !/\d/.test(s);

    const isTitleCase = (s: string) => {
      const words = s.split(/\s+/);
      return words.length >= 1 &&
        words.every(w => /^[A-Z][a-z]*$/.test(w) || w.length <= 2) &&
        !/\d/.test(s);
    };

    const candidates = lines
      .slice(0, 12)
      .filter(l => l.length >= 3 && l.length <= 60)
      .filter(l => /[A-Za-z]/.test(l))
      .filter(l => !skipPatterns.some(p => p.test(l)));

    const allCapsLine = candidates.find(l => isAllCaps(l));
    if (allCapsLine) {
      console.log('[ReceiptScanner] Merchant via ALL CAPS:', allCapsLine);
      return this._titleCase(allCapsLine);
    }

    const titleCaseLine = candidates.find(l => isTitleCase(l));
    if (titleCaseLine) {
      console.log('[ReceiptScanner] Merchant via Title Case:', titleCaseLine);
      return titleCaseLine;
    }

    if (candidates.length > 0) {
      console.log('[ReceiptScanner] Merchant via fallback:', candidates[0]);
      return this._titleCase(candidates[0]);
    }

    return '';
  }


  private _extractLineItems(lines: string[], merchantName: string): ScannedLineItem[] {
    const items: ScannedLineItem[] = [];

    let startIndex = 0;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      if (/\b(items?|order|qty|description|particulars)\b/i.test(lines[i])) {
        startIndex = i + 1;
        break;
      }
    }

    const merchantNorm = (merchantName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const skipLine = (line: string): boolean => {
      if (FOOTER_KEYWORDS.some(kw => kw.test(line)))    return true;
      if (TAX_KEYWORDS.some(kw => kw.test(line)))        return true;
      if (SUBTOTAL_KEYWORDS.some(kw => kw.test(line)))   return true;
      if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(line)) return true;
      if (/^(\+?234|0)[\d\s-]{9,}/.test(line))          return true;
      if (/^table[s]?\b/i.test(line))                     return true;
      if (/^check\b/i.test(line))                         return true;
      const norm = line.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (merchantNorm && norm.includes(merchantNorm))     return true;
      return false;
    };

    const patternFull   = /^\s*(\d+)\s*[x×]?\s+(.+?)\s+([=₦$£€]?\s*\d[\d,]*(?:\.\d{1,2})?)$/;
    const patternSimple = /^\s*(.+?)\s+([=₦$£€]?\s*\d[\d,]*(?:\.\d{1,2})?)$/;

    const parseNum = (s: string) => parseFloat(s.replace(/,/g, ''));

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (FOOTER_KEYWORDS.some(kw => kw.test(line)) ||
          SUBTOTAL_KEYWORDS.some(kw => kw.test(line))) break;

      if (skipLine(line) || line.length < 4) continue;

      const m1 = line.match(patternFull);
      if (m1) {
        items.push({ qty: m1[1] ? parseInt(m1[1]) : 1, name: this._titleCase(m1[2].trim()), price: parseNum(m1[3]) });
        continue;
      }

      const m2 = line.match(patternSimple);
      if (m2) {
        items.push({ qty: 1, name: this._titleCase(m2[1].trim()), price: parseNum(m2[2]) });
        continue;
      }

      if (/^[A-Za-z][A-Za-z0-9\s/&'.-]{2,40}$/.test(line) && i + 1 < lines.length) {
        const priceOnly = lines[i + 1].match(/^[=₦$£€\s]*(\d[\d,]+(?:\.\d{1,2})?)$/);
        if (priceOnly) {
          items.push({ qty: 1, name: this._titleCase(line.trim()), price: parseNum(priceOnly[1]) });
          i++;
        }
      }
    }

    console.log(`[ReceiptScanner] ${items.length} line items:`, items);
    return items;
  }

  private _extractDate(text: string): string {
    const MONTHS: Record<string, string> = {
      jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
      jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12'
    };

    const patterns: { re: RegExp; handler: (m: RegExpMatchArray) => string }[] = [
      { re: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
        handler: m => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
      { re: /\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b/,
        handler: m => `${m[1]}-${m[2]}-${m[3]}` },
      { re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\s]+(\d{4})\b/i,
        handler: m => `${m[3]}-${MONTHS[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}` },
      { re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})\b/i,
        handler: m => `${m[3]}-${MONTHS[m[1].toLowerCase().slice(0,3)]}-${m[2].padStart(2,'0')}` },
      { re: /\b(\d{2})\.(\d{2})\.(\d{4})\b/,
        handler: m => `${m[3]}-${m[2]}-${m[1]}` },
    ];

    for (const { re, handler } of patterns) {
      const m = text.match(re);
      if (m) {
        const result = handler(m);
        console.log('[ReceiptScanner] Date detected:', result);
        return result;
      }
    }
    return '';
  }



  // ✅ FIX: now accepts 1+ digits (not requiring 2)
  private _extractNumber(s: string): number | null {
    if (!s) return null;
    const cleaned = s.replace(/[=₦$£€,\s]/gi, '');
    const m = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
    return m ? parseFloat(m[1]) : null;
  }

  private _extractMerchantPhone(lines: string[]): string {
    const phonePattern = /(\+?234|0)?\s*\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/;
    for (const line of lines.slice(0, 10)) {
      const cleaned = line.replace(/[^\d+\s-]/g, '');
      const match   = cleaned.match(phonePattern);
      if (match && match[0].replace(/\D/g, '').length >= 10) return match[0].trim();
    }
    return '';
  }

  private _extractMerchantAddress(lines: string[], merchantName: string): string {
    const stopPatterns = [
      /^\d{2}[-/]\d{2}[-/]\d{4}/,
      /^(check|table|receipt|total|sub.?total|tel|phone|contact)\b/i,
      /^\d{10,}/,
    ];
    const merchantIndex = merchantName
      ? lines.findIndex(l => l.toLowerCase().includes(merchantName.toLowerCase()))
      : -1;
    const from = merchantIndex >= 0 ? merchantIndex + 1 : 1;
    const addr: string[] = [];
    for (let i = from; i < Math.min(lines.length, from + 4); i++) {
      if (!lines[i] || stopPatterns.some(p => p.test(lines[i]))) break;
      if (/[A-Za-z]/.test(lines[i]) && !/^[0-9\s]+$/.test(lines[i])) addr.push(lines[i]);
    }
    return addr.join(', ');
  }

  private _extractMerchantContact(lines: string[]): string {
    const idx = lines.findIndex(l => /served\s+by/i.test(l));
    if (idx >= 0 && idx + 1 < lines.length) return lines[idx + 1].trim();
    return '';
  }

  private _titleCase(s: string): string {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
}