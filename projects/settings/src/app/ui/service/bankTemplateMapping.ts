import { Injectable } from '@angular/core';
import { BankExportTemplate } from '../view/hr/payroll/bank-teller-mapping/bank-teller-mapping.component';

@Injectable({ providedIn: 'root' })
export class BankTemplateService {
  private storageKey = 'bankTemplate'; // singular

  getTemplate(): BankExportTemplate | null {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : null;
  }

  saveTemplate(template: BankExportTemplate) {
    localStorage.setItem(this.storageKey, JSON.stringify(template));
  }

  deleteTemplate() {
    localStorage.removeItem(this.storageKey);
  }
}