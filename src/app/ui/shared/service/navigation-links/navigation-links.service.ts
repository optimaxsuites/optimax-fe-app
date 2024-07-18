import { Injectable } from '@angular/core';
import { v4 as uuidV4 } from 'uuid';


@Injectable({
  providedIn: 'root'
})
export class NavigationLinksService {

  private links: { [key: string]: string } = {};

  constructor() {
    this.generateLinks();
  }

  private generateLinks(): void {
    this.links['dashboardLink'] = '/admin/dashboard/' + uuidV4();
    this.links['userRegistrationLink'] = '/admin/settings/user-reg/' + uuidV4();
    this.links['salesLink'] = '/admin/sales/' +uuidV4();
    this.links['purchaseLink'] = '/admin/purchase/' +uuidV4();
    this.links['inventoryLink'] = '/admin/inventory/' +uuidV4();
    this.links['procurementLink'] = '/admin/procurement/' +uuidV4();
    this.links['accountingLink'] = '/admin/accounting/' +uuidV4();
    this.links['hrLink'] = '/admin/hr/' +uuidV4();
    this.links['posLink'] = '/admin/pos/' +uuidV4();
    this.links['crmLink'] = '/admin/crm/' +uuidV4();
    this.links['settingsLink'] = '/admin/settings/' +uuidV4();
    this.links['expensesLink'] = '/admin/expenses/' + uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' + uuidV4();


// auth links ================================================================================================================
    this.links['signinLink'] = '/user/auth/sign-in' +uuidV4();
    this.links['vrsLink'] = '/user/auth/vrs/' +uuidV4();
    this.links['vrfLink'] = '/user/auth/vrf/' +uuidV4();
    this.links['signupLink'] = '/user/auth/sign-up/' +uuidV4();
    this.links['emvLink'] = '/user/auth/emv/' +uuidV4();
    this.links['verifyLink'] = '/user/auth/verify';
//=============================================================================================================================


    this.links['checkoutLink'] = '/user/checkout/' +uuidV4();
    this.links['checkoutOrderLink'] = '/user/checkout/orders/' +uuidV4();
    this.links['cashPayment'] = '/user/checkout/cash-payment/' +uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' +uuidV4();


    

  }

  getLink(linkName: string): string {
    return this.links[linkName];
  }

  regenerateLinks(): void {
    this.generateLinks();
  }
}
