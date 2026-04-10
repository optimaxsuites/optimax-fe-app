import { Injectable } from '@angular/core';

export interface ReceiptFileMetadata {
  fileName:   string;
  mediaNo:    string;   
  size:       number;
  type:       string;
  uploadedAt: number;
}

export interface ReceiptCacheInfo {
  companyReceipts:  ReceiptFileMetadata[];
  employeeReceipts: ReceiptFileMetadata[];
}

@Injectable({ providedIn: 'root' })
export class ReceiptCacheService {

  private readonly storageKey = 'receiptMetadataCache';
  private cache: Record<string, ReceiptCacheInfo> = this.loadCache();

  private loadCache(): Record<string, ReceiptCacheInfo> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[ReceiptCacheService] Failed to load cache from localStorage:', e);
      return {};
    }
  }

  private saveCache(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
    } catch (e) {
      console.warn('[ReceiptCacheService] Failed to save cache to localStorage:', e);
    }
  }
  private isRealMediaNo(mediaNo: string): boolean {
    if (!mediaNo || typeof mediaNo !== 'string') return false;

    const m = mediaNo.trim();
    if (!m) return false;

    // Reject locally-generated patterns
    const localPatterns = [
      /^company_/i,                  // "company_1775468804128_4h3syannk"
      /^employee_/i,                 // "employee_..."
      /^receipt_/i,
      /^\d{10,}_/,                   // starts with a Unix timestamp
      /[/\\]/,                       // filesystem paths
      /\.(jpg|jpeg|png|pdf|webp)$/i, // file extensions
    ];

    if (localPatterns.some(p => p.test(m))) {
      return false;
    }

    // Accept: alphanumeric strings between 6 and 40 chars (real backend IDs)
    // Examples: "dRVMFD8HHOZ", "d723DV3W5QL", "abc123XYZ"
    if (/^[A-Za-z0-9_-]{6,40}$/.test(m)) {
      return true;
    }

    // Also accept if it looks like a filename without an extension (no dots, no slashes)
    // and is short enough to be a reference key
    if (m.length <= 50 && !/[./\\]/.test(m)) {
      return true;
    }

    return false;
  }


  setReceiptInfo(
    expenseId:        number | string,
    companyReceipts:  ReceiptFileMetadata[] = [],
    employeeReceipts: ReceiptFileMetadata[] = []
  ): void {
    const id = String(expenseId);

    const validCompany = (companyReceipts ?? []).filter(m => {
      const valid = this.isRealMediaNo(m.mediaNo);
      if (!valid) {
        console.warn(
          `[ReceiptCacheService] ⚠️  Skipping company receipt with invalid/local mediaNo: "${m.mediaNo}"` +
          ` — this is a frontend-generated name, not a real backend ID.` +
          ` Make sure you're reading mediaNo from the API response, not constructing it locally.`
        );
      }
      return valid;
    });

    const validEmployee = (employeeReceipts ?? []).filter(m => {
      const valid = this.isRealMediaNo(m.mediaNo);
      if (!valid) {
        console.warn(
          `[ReceiptCacheService] ⚠️  Skipping employee receipt with invalid/local mediaNo: "${m.mediaNo}"`
        );
      }
      return valid;
    });

    if (!validCompany.length && !validEmployee.length) {
      console.warn(
        `[ReceiptCacheService] ⚠️  No valid receipt metadata to cache for expense ${id}.` +
        ` All provided mediaNo values were rejected. Receipts will NOT be persisted across approval.`
      );
      return;
    }

    this.cache[id] = {
      companyReceipts:  validCompany,
      employeeReceipts: validEmployee,
    };
    this.saveCache();

    console.log(`[ReceiptCacheService] ✅ Cached REAL receipt metadata for expense ${id}:`, {
      company:  validCompany.map(m => m.mediaNo),
      employee: validEmployee.map(m => m.mediaNo),
    });
  }

  getReceiptInfo(expenseId: number | string): ReceiptCacheInfo | null {
    const cached = this.cache[String(expenseId)] ?? null;
    if (cached) {
      console.log(`[ReceiptCacheService] Retrieved cached metadata for expense ${expenseId}:`, {
        company:  cached.companyReceipts.map(m => m.mediaNo),
        employee: cached.employeeReceipts.map(m => m.mediaNo),
      });
    }
    return cached;
  }

  clearReceiptInfo(expenseId: number | string): void {
    const id = String(expenseId);
    if (this.cache[id]) {
      delete this.cache[id];
      this.saveCache();
      console.log(`[ReceiptCacheService] Cleared cache for expense ${id}`);
    }
  }


  debugDump(): void {
    console.table(
      Object.entries(this.cache).map(([id, info]) => ({
        expenseId: id,
        company:   info.companyReceipts.map(m => m.mediaNo).join(', ') || '(none)',
        employee:  info.employeeReceipts.map(m => m.mediaNo).join(', ') || '(none)',
      }))
    );
  }
}