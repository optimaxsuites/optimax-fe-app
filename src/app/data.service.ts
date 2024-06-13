import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as generateUniqueId } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor() {
    this.loadExistingRfqs();
    this.loadExistingVCats();
  }

  private rfqList: any[] = [];
  private vCatList: any[] = [];

  private rfqListSubject = new BehaviorSubject<any[]>(this.rfqList);
  rfqList$ = this.rfqListSubject.asObservable();

  private vCatListSubject = new BehaviorSubject<any[]>(this.vCatList);
  vCatList$ = this.vCatListSubject.asObservable();

  private updateLocalStorage() {
    localStorage.setItem('rfqList', JSON.stringify(this.rfqList));
    this.rfqListSubject.next(this.rfqList);
  }

  private loadExistingRfqs() {
    const storedRfqList = localStorage.getItem('rfqList');
    if (storedRfqList) {
      this.rfqList = JSON.parse(storedRfqList);
      this.rfqListSubject.next(this.rfqList);
    }
  }

  private loadExistingVCats() {
    const storedVCatList = localStorage.getItem('vCatList');
    if (storedVCatList) {
      this.rfqList = JSON.parse(storedVCatList);
      this.vCatListSubject.next(this.vCatList);
    }
  }

  saveRfqData(rfqData: any) {
    rfqData.id = generateUniqueId();
    this.rfqList.push(rfqData);
    this.updateLocalStorage();
  }

  getRfqData(id: string) {
    return this.rfqList.find((rfq) => rfq.id === id);
  }

  getAllRfqs() {
    return this.rfqList;
  }

  deleteRfq(id: string): void {
    this.rfqList = this.rfqList.filter((rfq) => rfq.id !== id);
    this.updateLocalStorage();
  }

  duplicateRfq(rfq: any): void {
    const duplicatedRfq = { ...rfq, id: generateUniqueId(), fontColor: 'red' };
    const originalIndex = this.rfqList.findIndex((item) => item.id === rfq.id);
    this.rfqList.splice(originalIndex + 1, 0, duplicatedRfq);
    this.updateLocalStorage();
  }

  private updateLocalStorageForVendors() {
    localStorage.setItem('vCatList', JSON.stringify(this.vCatList));
    this.vCatListSubject.next(this.vCatList);
  }

  saveVCatData(vCatData: any) {
    vCatData.id = generateUniqueId();
    this.vCatList.push(vCatData);
    this.updateLocalStorageForVendors();
  }

  getVCatData(id: string) {
    return this.vCatList.find((vCat) => vCat.id === id);
  }

  getAllVCats() {
    return this.vCatList;
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
