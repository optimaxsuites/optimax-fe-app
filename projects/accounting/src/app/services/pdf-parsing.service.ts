import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../ui/sharedComponent/service/environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class PdfParsingService {

  private readonly extractUrl = `${environment.apiBaseUrl}/x/api/v2/ai/document/extract-transactions`;
  private readonly MAX_PAGES = 15;

  constructor(private http: HttpClient) {}

  /**
   * Main entry point.
   * - PDF files: renders each page to a PNG canvas, sends pages to backend vision API.
   * - Image files: sends directly to backend.
   * - Falls back to client-side pdf.js text extraction on any failure.
   */
  async extractTableData(buffer: ArrayBuffer, originalFile?: File): Promise<any[]> {
    const file = originalFile ?? new File([buffer], 'upload.pdf', { type: 'application/pdf' });

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const pageFiles = isPdf
        ? await this.renderPdfPagesToImages(buffer)
        : [file];

      if (pageFiles.length > 0) {
        const allRows: any[] = [];
        let firstMeta: any = null;

        for (let i = 0; i < pageFiles.length; i++) {
          const result = await this.extractViaBackend(pageFiles[i]);
          if (result && Array.isArray(result.rows) && result.rows.length > 0) {
            if (i === 0) firstMeta = result;
            allRows.push(...result.rows);
          }
        }

        if (allRows.length > 0) {
          return this.normaliseRows(allRows, firstMeta ?? {});
        }
      }
      console.warn('PdfParsingService: backend returned empty rows, falling back to pdf.js');
    } catch (err) {
      console.warn('PdfParsingService: backend extraction failed, falling back to pdf.js', err);
    }

    return this.extractViaPdfJs(buffer);
  }

  // ── PDF → PNG rendering ────────────────────────────────────────────────────

  /**
   * Renders each page of a PDF to a high-resolution PNG File using pdf.js canvas.
   * Sends real image bytes to the backend so the vision API receives proper PNG data.
   */
  private async renderPdfPagesToImages(buffer: ArrayBuffer): Promise<File[]> {
    const pdfjs = await this.loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageCount = Math.min(pdf.numPages, this.MAX_PAGES);
    const pages: File[] = [];

    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
      });
      pages.push(new File([blob], `page_${p}.png`, { type: 'image/png' }));
    }

    return pages;
  }

  private async loadPdfJs(): Promise<any> {
    let pdfjs: any = (window as any).pdfjsLib;
    if (!pdfjs) {
      try { pdfjs = await import('pdfjs-dist'); } catch { /* ignore */ }
    }
    if (!pdfjs) throw new Error('PDF library (pdf.js) not available.');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      const v = pdfjs.version || '3.4.120';
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.js`;
    }
    return pdfjs;
  }

  // ── Backend (vision AI) ────────────────────────────────────────────────────

  private async extractViaBackend(file: File): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(this.http.post<any>(this.extractUrl, form));
  }

  /**
   * Normalises backend rows into the shape the rest of the app expects.
   * Statement-level metadata is attached to the first row for header-detection.
   */
  private normaliseRows(rows: any[], meta: any): any[] {
    return rows.map((row: any, i: number) => {
      const normalised: any = {
        date:        this.clean(row.date        ?? row.Date        ?? row.DATE        ?? ''),
        description: this.clean(row.description ?? row.Description ?? row.DESCRIPTION ?? row.narration ?? row.Narration ?? ''),
        reference:   this.clean(row.reference   ?? row.Reference   ?? row.ref         ?? row.Ref       ?? ''),
        debit:       this.clean(row.debit       ?? row.Debit       ?? row.DEBIT       ?? row.withdrawal ?? row.Withdrawal ?? ''),
        credit:      this.clean(row.credit      ?? row.Credit      ?? row.CREDIT      ?? row.deposit   ?? row.Deposit   ?? ''),
        balance:     this.clean(row.balance     ?? row.Balance     ?? row.BALANCE     ?? ''),
      };

      if (i === 0) {
        normalised['__currency']        = meta.currency        ?? '';
        normalised['__accountName']     = meta.accountName     ?? '';
        normalised['__accountNumber']   = meta.accountNumber   ?? '';
        normalised['__statementPeriod'] = meta.statementPeriod ?? '';
      }

      return normalised;
    });
  }

  private clean(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v).replace(/,/g, '').trim();
  }

  // ── Client-side fallback (pdf.js text layer) ───────────────────────────────

  private async extractViaPdfJs(buffer: ArrayBuffer): Promise<any[]> {
    const pdfjs = await this.loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const allRows: string[][] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const items: any[] = textContent.items;
      if (!items.length) continue;

      const thresholdY = 8;
      items.sort((a: any, b: any) => b.transform[5] - a.transform[5]);
      const rows: any[][] = [];
      let currentRow: any[] = [items[0]];
      let lastY = items[0].transform[5];

      for (let i = 1; i < items.length; i++) {
        const y = items[i].transform[5];
        if (Math.abs(y - lastY) < thresholdY) {
          currentRow.push(items[i]);
        } else {
          rows.push(currentRow);
          currentRow = [items[i]];
          lastY = y;
        }
      }
      if (currentRow.length) rows.push(currentRow);

      rows.forEach(rowItems => {
        rowItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
        const merged: string[] = [];
        let cell = '';
        let lastX = -1;
        let lastW = 0;
        rowItems.forEach((item: any) => {
          const x = item.transform[4];
          const w = item.width || item.str.length * 5;
          if (lastX === -1 || x - (lastX + lastW) < 15) {
            if (lastX !== -1 && x - (lastX + lastW) > 3) cell += ' ';
            cell += item.str;
          } else {
            if (cell.trim()) merged.push(cell.trim());
            cell = item.str;
          }
          lastX = x; lastW = w;
        });
        if (cell.trim()) merged.push(cell.trim());
        if (merged.length) allRows.push(merged);
      });
    }

    return this.processRawRows(allRows);
  }

  private processRawRows(rows: string[][]): any[] {
    if (!rows.length) return [];
    const headerKeywords = ['date', 'description', 'narrative', 'amount', 'credit', 'debit', 'balance', 'withdrawal', 'deposit', 'ref', 'value', 'details'];
    let headerIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const matches = rows[i].filter(c => headerKeywords.some(k => c.toLowerCase().includes(k))).length;
      if (matches >= 2) { headerIdx = i; break; }
    }

    if (headerIdx === -1) {
      const maxCols = Math.max(...rows.map(r => r.length));
      return rows.map(row => {
        const obj: any = {};
        for (let i = 0; i < maxCols; i++) obj[`Column_${i + 1}`] = row[i] ?? '';
        return obj;
      });
    }

    const headers = rows[headerIdx];
    return rows.slice(headerIdx + 1)
      .filter(row => row.some(c => c.length > 0) && !(row.length === 1 && /^\d+$/.test(row[0])))
      .map(row => {
        const obj: any = {};
        headers.forEach((h, i) => { obj[h.trim() || `Column_${i + 1}`] = row[i] ?? ''; });
        return obj;
      });
  }
}
