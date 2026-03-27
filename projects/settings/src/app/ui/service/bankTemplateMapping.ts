import { Injectable } from '@angular/core';
import { BankExportTemplate } from '../view/hr/payroll/bank-teller-mapping/bank-teller-mapping.component';


@Injectable({ providedIn: 'root' })
export class BankTemplateService {
  private storageKey = 'bankTemplates';

  getTemplates(): BankExportTemplate[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  saveTemplate(template: BankExportTemplate) {
    const templates = this.getTemplates();
    const idx = templates.findIndex(t => t.id === template.id);
    if (idx > -1) templates[idx] = template;
    else templates.push(template);
    localStorage.setItem(this.storageKey, JSON.stringify(templates));
  }

  deleteTemplate(id: number) {
    const templates = this.getTemplates().filter(t => t.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(templates));
  }
}