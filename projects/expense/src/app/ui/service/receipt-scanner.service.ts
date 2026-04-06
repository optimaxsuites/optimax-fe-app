import { Injectable } from '@angular/core';

export interface ScannedReceiptData {
  merchantName:     string;
  merchantPhone?:   string;
  merchantAddress?: string;
  merchantEmail?:   string;
  merchantContact?: string;
  expenseName:      string;
  description:      string;
  amount:           number | null;
  date:             string;
  lineItems:        { qty: number; name: string; price: number }[];
  confidence:       'high' | 'medium' | 'low';
  rawText:          string;
  warnings:         string[];
}

@Injectable({ providedIn: 'root' })
export class ReceiptScannerService {

  // ─────────────────────────────────────────────────────────────────────────
  // scanImage
  //
  // Loads Tesseract.js dynamically (avoids bundle cost when not scanning),
  // runs OCR on the provided image file, then parses the raw text into
  // structured expense fields.
  //
  // Returns a ScannedReceiptData object. Fields that could not be extracted
  // reliably are left empty/null; the `warnings` array explains what failed.
  // ─────────────────────────────────────────────────────────────────────────
  async scanImage(file: File): Promise<ScannedReceiptData> {
    // Dynamic import — Tesseract.js is only loaded when the user actually
    // clicks "Scan Receipt", keeping the initial bundle lean.
    const Tesseract = await import('tesseract.js');

    const result = await Tesseract.recognize(file, 'eng', {
      // No logger callback — keeps console clean in production
    });

    const rawText = result.data.text;
    console.log('[ReceiptScanner] Raw OCR text:\n', rawText);

    return this._parseReceiptText(rawText);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // scanFromUrl  (used when the user pastes an image URL or for testing)
  // ─────────────────────────────────────────────────────────────────────────
  async scanFromDataUrl(dataUrl: string): Promise<ScannedReceiptData> {
    const Tesseract = await import('tesseract.js');
    const result    = await Tesseract.recognize(dataUrl, 'eng', {});
    return this._parseReceiptText(result.data.text);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // _parseReceiptText
  //
  // Main parsing pipeline applied to the raw OCR string.
  // Steps:
  //   1. Clean / normalise the text
  //   2. Extract merchant name (first non-empty lines)
  //   3. Extract date
  //   4. Extract total amount
  //   5. Extract line items
  //   6. Build description from line items
  //   7. Assign confidence level
  // ─────────────────────────────────────────────────────────────────────────
  private _parseReceiptText(raw: string): ScannedReceiptData {
    const warnings: string[] = [];
    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // ── 1. Merchant name ──────────────────────────────────────────────────
    // Heuristic: the merchant is usually in the first 1-4 non-empty lines,
    // before any numeric data or keywords like TABLE / CHECK / DATE appear.
    const merchantName = this._extractMerchant(lines);
    const expenseName = merchantName || (lines[0] || '');
    const merchantPhone = this._extractMerchantPhone(lines);
    const merchantAddress = this._extractMerchantAddress(lines, merchantName);
    const merchantContact = this._extractMerchantContact(lines);

    // ── 2. Date ───────────────────────────────────────────────────────────
    const date = this._extractDate(raw);
    if (!date) warnings.push('Transaction date could not be detected.');

    // ── 3. Total amount ───────────────────────────────────────────────────
    const amount = this._extractTotal(lines, raw);
    if (amount === null) warnings.push('Total amount could not be detected. Please enter manually.');

    // ── 4. Line items ─────────────────────────────────────────────────────
    const lineItems = this._extractLineItems(lines);
    if (!lineItems.length) warnings.push('Individual line items could not be parsed.');

    // ── 5. Description from line items ────────────────────────────────────
    const description = lineItems.length
      ? lineItems.map(i => `${i.qty}x ${i.name} - ₦${i.price.toLocaleString()}`).join('\n')
      : '';

    // ── 6. Confidence ─────────────────────────────────────────────────────
    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (!merchantName || !date || amount === null) confidence = 'medium';
    if (!merchantName && amount === null)          confidence = 'low';

    return {
      merchantName,
      merchantPhone,
      merchantAddress,
      merchantEmail:   '',
      merchantContact,
      expenseName,
      description,
      amount,
      date,
      lineItems,
      confidence,
      rawText: raw,
      warnings,
    };
  }

  private _extractMerchant(lines: string[]): string {
    const skipPatterns = [
      /^\d{2}[-/]\d{2}[-/]\d{4}/,           // date line
      /^check\s*#/i,
      /^table\s*#/i,
      /^receipt/i,
      /^\d{10,}/,                             // phone number
      /^(sub.?total|total|tax|vat|gst|amount)/i,
      /^\d+\s*\w+\s+\d+$/,                  // line item (qty item price)
      /^\d+\s*[:.-]/,
      /\b(phone|tel|contact|address|abj|abuja|lagos|nigeria)\b/i,
    ];

    const candidates = lines
      .slice(0, 8)
      .map(line => line.replace(/\s{2,}/g, ' ').trim())
      .filter(line => line.length >= 3)
      .filter(line => !skipPatterns.some(p => p.test(line)))
      .filter(line => /[A-Za-z]/.test(line));

    if (candidates.length) {
      // Use the first non-generic merchant line as the merchant name.
      // This ensures the first receipt name is also the expense name.
      return this._titleCase(candidates[0]);
    }

    return '';
  }

  private _merchantScore(line: string): number {
    let score = 100 - line.length;
    if (/\b(way|garden|road|street|lane|plaza|hotel|market|suite|floor|abuja|lagos|nigeria)\b/i.test(line)) score -= 20;
    if (/\d/.test(line)) score -= 50;
    if (/\b(farm|city|shop|store|mart|deli|cafe|restaurant|bar|hotel)\b/i.test(line)) score += 15;
    return score;
  }

  private _extractMerchantPhone(lines: string[]): string {
    const phonePattern = /(\+?234|0)?\s*\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/;
    for (const line of lines.slice(0, 8)) {
      const cleaned = line.replace(/[^\d\+\s-]/g, '');
      const match = cleaned.match(phonePattern);
      if (match && match[0].replace(/\D/g, '').length >= 10) {
        return match[0].trim();
      }
    }
    return '';
  }

  private _extractMerchantAddress(lines: string[], merchantName: string): string {
    const addressLines: string[] = [];
    const stopPatterns = [/^\d{2}[-/]\d{2}[-/]\d{4}/, /^check\s*#/i, /^table\s*#/i, /^total/i, /^sub.?total/i, /^receipt/i, /^tel|phone|contact/i, /^\d{10,}/, /\b(?:abj|abuja|lagos|nigeria)\b/i];
    const merchantIndex = merchantName ? lines.findIndex(l => l.toLowerCase().includes(merchantName.toLowerCase())) : -1;
    const scanFrom = merchantIndex >= 0 ? merchantIndex + 1 : 0;

    for (let i = scanFrom; i < Math.min(lines.length, scanFrom + 5); i++) {
      const line = lines[i];
      if (!line || stopPatterns.some(p => p.test(line))) break;
      if (/[A-Za-z]/.test(line) && !/^[0-9\s]+$/.test(line)) {
        addressLines.push(line);
      }
    }

    return addressLines.join(', ');
  }

  private _extractMerchantContact(lines: string[]): string {
    const servedIndex = lines.findIndex(l => /served by/i.test(l));
    if (servedIndex >= 0 && servedIndex + 1 < lines.length) {
      return lines[servedIndex + 1].trim();
    }
    const maybeContact = [...lines].reverse().find(l => /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(l));
    return maybeContact?.trim() || '';
  }

  private _extractDate(text: string): string {
    const patterns: { re: RegExp; handler: (m: RegExpMatchArray) => string }[] = [
      // DD-MM-YYYY or DD/MM/YYYY
      {
        re: /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/,
        handler: m => `${m[3]}-${m[2]}-${m[1]}`,
      },
      // YYYY-MM-DD
      {
        re: /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/,
        handler: m => `${m[1]}-${m[2]}-${m[3]}`,
      },
      // Month name: "Apr 02, 2026" or "02 April 2026"
      {
        re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
        handler: m => {
          const months: Record<string, string> = {
            jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
            jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'
          };
          return `${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
        },
      },
    ];

    for (const { re, handler } of patterns) {
      const m = text.match(re);
      if (m) return handler(m);
    }
    return '';
  }


  private _extractTotal(lines: string[], rawText: string): number | null {
    // Keyword indicators for the total line (ordered by priority)
    const totalKeywords = [
      /\bgrand\s+total\b/i,
      /\btotal\b/i,
      /\bamount\s+due\b/i,
      /\bbalance\s+due\b/i,
    ];

    // Exclude sub-total lines
    const subTotalKeyword = /\bsub.?total\b/i;

    // Number extractor — handles 77,547, 77.547, 77547, =N= 77,547
    const extractNumber = (s: string): number | null => {
      const cleaned = s.replace(/[=₦$£€,#\s]/gi, '');
      const m = cleaned.match(/(\d+(?:\.\d{1,2})?)/);
      return m ? parseFloat(m[1]) : null;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (subTotalKeyword.test(line)) continue;

      if (totalKeywords.some(kw => kw.test(line))) {
        const withoutLabel = line.replace(/total|grand|amount|due|balance|=N=|₦/gi, '');
        const numOnLine = extractNumber(withoutLabel);
        if (numOnLine !== null && numOnLine > 0) return numOnLine;

        if (i + 1 < lines.length) {
          const numNextLine = extractNumber(lines[i + 1]);
          if (numNextLine !== null && numNextLine > 0) return numNextLine;
        }
      }
    }

    // Raw fallback: detect total amount anywhere in receipt text
    const rawMatch = rawText.match(/total[^\d\n]*([=₦$£€\s]*[\d,\.]+)/i);
    if (rawMatch) {
      const fallback = extractNumber(rawMatch[1]);
      if (fallback !== null && fallback > 0) return fallback;
    }

    return null;
  }

  private _extractLineItems(lines: string[]): { qty: number; name: string; price: number }[] {
    const items: { qty: number; name: string; price: number }[] = [];

    const skipKeywords = /^(sub.?total|total|grand|amount|due|balance|table|check|receipt|date|server|served|thank|tel|phone|vat|tax|address|way|garden|abuja|lagos|nigeria)/i;

    // Pattern 1: qty + name + price on same line
    //   "2  NESTLE WATER   2150"
    const pattern1 = /^(\d+)[x\s]+([A-Z][A-Z\s]+?)\s{2,}(\d[\d,]+)$/i;

    // Pattern 2: name + price (no leading qty)
    //   "COCONUT RICE   5259"
    const pattern2 = /^([A-Z][A-Z\s]{3,}?)\s{2,}(\d[\d,]+)$/i;

    // Pattern 3: qty at start, name rest, price after tabs/spaces
    //   "1 SEAFOOD OKRO 25800"
    const pattern3 = /^(\d+)\s+([A-Z][A-Z\s]+?)\s+(\d[\d,]+)$/i;

    const parseNum = (s: string) => parseInt(s.replace(/,/g, ''), 10);

    for (const line of lines) {
      if (skipKeywords.test(line)) continue;
      if (line.length < 5) continue;

      let m: RegExpMatchArray | null;

      if ((m = line.match(pattern1))) {
        items.push({ qty: parseInt(m[1]), name: this._titleCase(m[2].trim()), price: parseNum(m[3]) });
      } else if ((m = line.match(pattern3))) {
        items.push({ qty: parseInt(m[1]), name: this._titleCase(m[2].trim()), price: parseNum(m[3]) });
      } else if ((m = line.match(pattern2))) {
        items.push({ qty: 1, name: this._titleCase(m[1].trim()), price: parseNum(m[2]) });
      }
    }

    return items;
  }

  private _titleCase(s: string): string {
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}