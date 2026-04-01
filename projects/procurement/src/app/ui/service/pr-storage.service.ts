import { Injectable } from '@angular/core';
import { PurchaseRequisitionLS } from '../domain/procurement.dto';

@Injectable({
  providedIn: 'root'
})
export class PrStorageService {

  constructor() { 
    
  }

  private readonly KEY = 'erp.purchaseRequisitions';

  getAll(): PurchaseRequisitionLS[] {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveAll(list: PurchaseRequisitionLS[]): void {
    localStorage.setItem(this.KEY, JSON.stringify(list));
  }

  add(pr: PurchaseRequisitionLS): void {
    const list = this.getAll();
    list.push(pr);
    this.saveAll(list);
  }

  update(updated: PurchaseRequisitionLS): void {
    const list = this.getAll();
    const idx = list.findIndex(x => x.id === updated.id);
    if (idx === -1) return;
    list[idx] = updated;
    this.saveAll(list);
  }

  getById(id: number): PurchaseRequisitionLS | undefined {
    return this.getAll().find(x => x.id === id);
  }

  remove(id: number): void {
    this.saveAll(this.getAll().filter(x => x.id !== id));
  }
}
