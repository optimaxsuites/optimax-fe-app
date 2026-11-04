import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../sharedComponent/service/environments/environment.prod';

export interface ScannedReceiptData {
  merchantName:     string;
  merchantPhone?:   string;
  merchantAddress?: string;
  merchantEmail?:   string;
  merchantContact?: string;
  expenseName:      string;
  description:      string;
  amount:           number | null;
  subTotal:         number | null;
  taxAmount:        number | null;
  taxRate:          number | null;
  taxLabel:         string;
  quantity:         number | null;
  date:             string;
  lineItems:        ScannedLineItem[];
  confidence:       'high' | 'medium' | 'low';
  rawText:          string;
  warnings:         string[];
}

export interface ScannedLineItem {
  qty:        number;
  name:       string;
  unitPrice:  number;
  totalPrice: number;
}

@Injectable({ providedIn: 'root' })
export class ReceiptScannerService {

  private readonly extractUrl = `${environment.apiBaseUrl}/x/api/v2/ai/document/extract-receipt`;

  constructor(private http: HttpClient) {}

  async scanImage(file: File): Promise<ScannedReceiptData> {
    if (!file) throw new Error('File is required');

    const form = new FormData();
    form.append('file', file);

    const raw = await firstValueFrom(this.http.post<any>(this.extractUrl, form));
    return this.mapResult(raw, file.name);
  }

  async scanFromDataUrl(dataUrl: string): Promise<ScannedReceiptData> {
    if (!dataUrl) throw new Error('Data URL is required');

    const blob = await fetch(dataUrl).then(r => r.blob());
    const ext  = dataUrl.startsWith('data:image/jpeg') ? 'jpg'
               : dataUrl.startsWith('data:image/webp') ? 'webp' : 'png';
    const file = new File([blob], `receipt.${ext}`, { type: blob.type || 'image/png' });
    return this.scanImage(file);
  }

  // kept for compatibility — no-op since there is no worker to terminate
  async terminateWorker(): Promise<void> {}

  // ── Map AI response → ScannedReceiptData ──────────────────────────────────

  private mapResult(r: any, filename?: string): ScannedReceiptData {
    if (r?.error) throw new Error(r.error);

    const warnings: string[] = [];

    const merchantName    = this.str(r?.merchantName);
    const date            = this.str(r?.date);
    const amount          = this.num(r?.amount);
    const subTotal        = this.num(r?.subTotal);
    const taxAmount       = this.num(r?.taxAmount);
    const taxRate         = this.num(r?.taxRate);
    const taxLabel        = this.str(r?.taxLabel);
    const merchantPhone   = this.str(r?.merchantPhone);
    const merchantAddress = this.str(r?.merchantAddress);
    const merchantEmail   = this.str(r?.merchantEmail);
    const merchantContact = this.str(r?.merchantContact);
    const expenseName     = this.str(r?.expenseName) || merchantName || this.str(filename);

    if (!merchantName) warnings.push('Merchant name could not be detected.');
    if (!date)         warnings.push('Transaction date could not be detected.');
    if (amount === null) warnings.push('Total amount could not be detected. Please enter manually.');
    if (taxAmount === null && taxRate === null) warnings.push('Tax could not be detected.');

    const rawItems: any[] = Array.isArray(r?.lineItems) ? r.lineItems : [];
    const lineItems: ScannedLineItem[] = rawItems
      .filter(i => i?.name)
      .map(i => {
        const qty        = Math.max(1, Math.round(Number(i.qty) || 1));
        const totalPrice = this.round(Number(i.totalPrice) || 0);
        const unitPrice  = this.round(Number(i.unitPrice)  || (qty > 0 ? totalPrice / qty : totalPrice));
        return { qty, name: String(i.name).trim(), unitPrice, totalPrice };
      });

    if (!lineItems.length) warnings.push('Individual line items could not be parsed.');

    const description = lineItems.length
      ? lineItems.map(i => `${i.qty}x  ${i.name}  —  ₦${i.totalPrice.toLocaleString()}`).join('\n')
      : '';

    const fieldsFound = [merchantName, date, amount].filter(v => v !== null && v !== '').length;
    const confidence: 'high' | 'medium' | 'low' =
      fieldsFound === 3 ? 'high' : fieldsFound === 2 ? 'medium' : 'low';

    return {
      merchantName, merchantPhone, merchantAddress, merchantEmail, merchantContact,
      expenseName, description, amount, subTotal, taxAmount, taxRate, taxLabel,
      quantity: lineItems.length || null,
      date, lineItems, confidence,
      rawText: '',
      warnings,
    };
  }

  private str(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  }

  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  private round(v: number): number {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }
}
