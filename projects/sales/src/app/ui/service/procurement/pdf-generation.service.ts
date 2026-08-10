import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../shared-component/service/environments/environment';

export type PdfDocumentType = 'LPO' | 'GRN' | 'PAYMENT_VOUCHER' | 'PAYMENT_RECEIPT' | 'RFQ' | 'QUOTATION' | 'INVOICE';

export interface PdfGenerationRequest {
  documentType: PdfDocumentType;
  documentId: string;
  documentNumber: string;
  tenantId: string;
  data?: Record<string, any>;
}

export interface PdfGenerationResult {
  url?: string;
  blob?: Blob;
  success: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfGenerationService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  /**
   * Requests PDF generation from the backend. Falls back to browser print if API unavailable.
   */
  generatePdf(req: PdfGenerationRequest): Observable<PdfGenerationResult> {
    return this.http.post<any>(`${this.baseUrl}/documents/generate-pdf`, {
      ...req, tenantId: this.tenantId
    }, { responseType: 'blob' as any }).pipe(
      catchError(err => {
        console.warn('[PdfGenerationService] Server PDF generation unavailable, using browser print:', err);
        return of({ success: false, message: 'Using browser print fallback' } as PdfGenerationResult);
      })
    );
  }

  /**
   * Browser-native print as fallback. Opens a print-optimized version of the current view.
   */
  printDocument(elementId?: string): void {
    if (elementId) {
      const el = document.getElementById(elementId);
      if (el) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>OptimaX Document</title>
                <style>
                  * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
                  body { margin: 0; padding: 20px; color: #1a1a2e; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
                  th { background: #f8fafc; font-weight: 600; }
                  .print-hide { display: none !important; }
                  @page { margin: 15mm; }
                </style>
              </head>
              <body>${el.innerHTML}</body>
            </html>
          `);
          win.document.close();
          win.print();
        }
        return;
      }
    }
    window.print();
  }

  /**
   * Downloads a file from a URL.
   */
  downloadFile(url: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Converts a Blob to a download.
   */
  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.downloadFile(url, fileName);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
