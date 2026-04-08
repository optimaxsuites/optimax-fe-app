import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SalesCardService {

  constructor() { }

   initializeSalesCard(): {
    salesno: string;
    title: string;
    icon: string;

  }[]{
    return [
      {salesno: '30,000', title: 'Sales', icon: 'fas fa-shopping-bag'},
      {salesno: '40,000', title: 'Accounting', icon: 'fas fa-wallet'},
      {salesno: '50,000', title: 'Procurement', icon: 'fas fa-shopping-cart'},
      {salesno: '60,000', title: 'Inventory', icon: 'fas fa-boxes'},
      
    ];
  }
}
