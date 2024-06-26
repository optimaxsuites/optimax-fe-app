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
    this.loadExistingIndividualVendors();
  }

  private rfqList: any[] = [];
  private vCatList: any[] = [];
  private individualVendorList: any[] = [];

  private rfqListSubject = new BehaviorSubject<any[]>(this.rfqList);
  rfqList$ = this.rfqListSubject.asObservable();

  private vCatListSubject = new BehaviorSubject<any[]>(this.vCatList);
  vCatList$ = this.vCatListSubject.asObservable();

  private individualVendorListSubject = new BehaviorSubject<any[]>(
    this.individualVendorList
  );
  individualVendorList$ = this.individualVendorListSubject.asObservable();

  private updateLocalStorage() {
    localStorage.setItem('rfqList', JSON.stringify(this.rfqList));
    this.rfqListSubject.next(this.rfqList);
  }

  private updateLocalStorageForVendors() {
    localStorage.setItem('vCatList', JSON.stringify(this.vCatList));
    this.vCatListSubject.next(this.vCatList);
  }

  private updateLocalStorageForIndividualVendor() {
    localStorage.setItem(
      'individualVendorList',
      JSON.stringify(this.individualVendorList)
    );
    this.individualVendorListSubject.next(this.individualVendorList);
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
      this.vCatList = JSON.parse(storedVCatList);
      this.vCatListSubject.next(this.vCatList);
    }
  }

  private loadExistingIndividualVendors() {
    const storedIndividualVendorList = localStorage.getItem(
      'individualVendorList'
    );
    if (storedIndividualVendorList) {
      this.vCatList = JSON.parse(storedIndividualVendorList);
      this.individualVendorListSubject.next(this.individualVendorList);
    }
  }

  saveRfqData(rfqData: any) {
    rfqData.id = generateUniqueId();
    this.rfqList.push(rfqData);
    this.updateLocalStorage();
  }

  saveVCatData(vCatData: any) {
    vCatData.id = generateUniqueId();
    this.vCatList.push(vCatData);
    this.updateLocalStorageForVendors();
  }

  saveIndividualVendorData(iVenList: any) {
    iVenList.id = generateUniqueId();
    this.individualVendorList.push(iVenList);
    this.updateLocalStorageForIndividualVendor();
  }

  updateIndividualVendorData(id: string, updatedData: any) {
    const index = this.individualVendorList.findIndex(vendor => vendor.id === id);
    if (index !== -1) {
      // Update existing vendor with new data
      this.individualVendorList[index] = { ...this.individualVendorList[index], ...updatedData };
  
      // Update local storage and emit updated list
      this.updateLocalStorageForIndividualVendor();
      this.individualVendorListSubject.next([...this.individualVendorList]);
    }
  }
  

  // updateIndividualVendorData(id: string, iVenList: any) {
  //   const index = this.individualVendorList.findIndex(
  //     (vendor) => vendor.id === iVenList.id
  //   );
  //   if (index !== -1) {
  //     this.individualVendorList[index] = iVenList;
  //     this.updateLocalStorageForIndividualVendor();
  //   }
  // }

  getRfqData(id: string) {
    return this.rfqList.find((rfq) => rfq.id === id);
  }

  getVCatData(id: string) {
    return this.vCatList.find((vCat) => vCat.id === id);
  }

  getIndividualVendorList(id: string) {
    this.individualVendorList.find((iVenList) => iVenList.id === id);
  }

  getAllRfqs() {
    return this.rfqList;
  }

  getAllVCats() {
    return this.vCatList;
  }

  getAllIndividualVendors() {
    return this.individualVendorList;
  }

  deleteRfq(id: string): void {
    this.rfqList = this.rfqList.filter((rfq) => rfq.id !== id);
    this.updateLocalStorage();
  }

  deleteVendor(id: string): void {
    this.individualVendorList = this.individualVendorList.filter(
      (vendor) => vendor.id !== id
    );
    this.updateLocalStorageForIndividualVendor();
  }

  duplicateRfq(rfq: any): void {
    const duplicatedRfq = { ...rfq, id: generateUniqueId(), fontColor: 'red' };
    const originalIndex = this.rfqList.findIndex((item) => item.id === rfq.id);
    this.rfqList.splice(originalIndex + 1, 0, duplicatedRfq);
    this.updateLocalStorage();
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
