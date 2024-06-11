import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { v4 as generateUniqueId } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor() {
    this.loadExistingRfqs();
  }

  private rfqList: any[] = [];

  private rfqListSubject = new BehaviorSubject<any[]>(this.rfqList);
  rfqList$ = this.rfqListSubject.asObservable();

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

  // private loadExistingRfqs() {
  //   this.rfqList = [];
  //   for (let i = 0; i < localStorage.length; i++) {
  //     const key = localStorage.key(i);
  //     if (key?.startsWith('rfqData_')) {
  //       const rfqData = JSON.parse(localStorage.getItem(key) || '{}');
  //       this.rfqList.push(rfqData);
  //     }
  //   }
  //   this.rfqListSubject.next(this.rfqList);
  // }

  saveRfqData(rfqData: any) {
    rfqData.id = generateUniqueId();
    this.rfqList.push(rfqData);
    this.updateLocalStorage();
  }

  getRfqData(id: string) {
    return this.rfqList.find((rfq) => rfq.id === id);
  }

  // saveRfqData(rfqData: any) {
  //   if (!rfqData.id) {
  //     rfqData.id = generateUniqueId();
  //   }
  //   localStorage.setItem(`rfqData_${rfqData.id}`, JSON.stringify(rfqData));
  //   const index = this.rfqList.findIndex((rfq) => rfq.id === rfqData.id);
  //   if (index !== -1) {
  //     this.rfqList[index] = rfqData;
  //   } else {
  //     this.rfqList.push(rfqData);
  //   }
  //   this.rfqListSubject.next(this.rfqList);
  // }

  // getRfqData(id: string) {
  //   // const rfqData = localStorage.getItem(`rfqData_${id}`);
  //   console.log('Looking for ID:', id); // Debugging line
  //   console.log('Current RFQ List:', this.rfqList);
  //   const foundRfq = this.rfqList.find((rfq) => rfq.id === id);
  //   console.log('Found RFQ:', foundRfq); // Debugging line
  //   return foundRfq;
  //   // return rfqData ? JSON.parse(rfqData) : null;
  // }

  getAllRfqs() {
    return this.rfqList;
  }

  deleteRfq(id: string): void {
    this.rfqList = this.rfqList.filter((rfq) => rfq.id !== id);
    this.updateLocalStorage();
    // const index = this.rfqList.findIndex((rfq) => rfq.id === id);
    // if (index !== -1) {
    //   this.rfqList.splice(index, 1);

    //   localStorage.setItem('rfqList', JSON.stringify(this.rfqList));
    // }
  }

  duplicateRfq(rfq: any): void {
    const duplicatedRfq = { ...rfq, id: generateUniqueId(), fontColor: 'red' };
    const originalIndex = this.rfqList.findIndex((item) => item.id === rfq.id);
    this.rfqList.splice(originalIndex + 1, 0, duplicatedRfq);
    this.updateLocalStorage();
    // const duplicatedRfq = { ...rfq, id: uuidv4(), fontColor: 'red' };
    // const originalIndex = this.rfqList.findIndex((item) => item.id === rfq.id);
    // this.rfqList.splice(originalIndex + 1, 0, duplicatedRfq);
    // localStorage.setItem('rfqList', JSON.stringify(this.rfqList));
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  // throw new Error('Function not implemented.');
}

// function uuidv4() {
//   throw new Error('Function not implemented.');
// }
