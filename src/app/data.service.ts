import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private rfqData = new BehaviorSubject<any>(null);
  currentRfqData = this.rfqData.asObservable();
  private storageKey = 'rfqData';
  private rfqList: any[] = [];

  constructor() {
    this.loadRfqData();
  }

  getRfqList(): any[] {
    return this.rfqList;
  }

  getRfqById(id: number): any {
    return this.rfqList.find((rfq) => rfq.id === id);
  }

  updateRfqData(rfqData: any) {
    this.rfqData.next(rfqData);
    this.rfqList.push(rfqData);
    rfqData.id = this.rfqList.length
      ? this.rfqList[this.rfqList.length - 1].id + 1
      : 1;
    this.updateRfqList();
    console.log(this.rfqList);
  }

  private loadRfqData(): void {
    const savedRfqData = localStorage.getItem(this.storageKey);
    if (savedRfqData) {
      this.rfqList = JSON.parse(savedRfqData);
    }
  }

  public updateRfqList(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.rfqList));
  }
}
