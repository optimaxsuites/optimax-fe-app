import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopProductService {

  constructor() { }

  initializeTopProduct(): {
    dateAndTime: string;
    invoice: string;
    invoiceNo: number;
    clientName: string;
    amount: string;
    status: string;
  } [] {
    return [
      
    ];
  }
}
