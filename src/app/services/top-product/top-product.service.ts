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
      // { dateAndTime: '04/04/23 - 3:30pm', invoice: 'Asus Nitro 5', invoiceNo: 625461874, clientName: "Centriguge Group", amount: '1,400,000', status: 'Delivered' },
      // { dateAndTime: '04/04/23 - 3:30pm', invoice: 'Asus Nitro 5', invoiceNo: 625461874, clientName: "Centriguge Group", amount: '1,400,000', status: 'Delivered' },
      // { dateAndTime: '04/04/23 - 3:30pm', invoice: 'Asus Nitro 5', invoiceNo: 625461874, clientName: "Centriguge Group", amount: '1,400,000', status: 'Delivered' },
      // { dateAndTime: '04/04/23 - 3:30pm', invoice: 'Asus Nitro 5', invoiceNo: 625461874, clientName: "Centriguge Group", amount: '1,400,000', status: 'Delivered' },
      // { dateAndTime: '04/04/23 - 3:30pm', invoice: 'Asus Nitro 5', invoiceNo: 625461874, clientName: "Centriguge Group", amount: '1,400,000', status: 'Delivered' },
    ];
  }
}
