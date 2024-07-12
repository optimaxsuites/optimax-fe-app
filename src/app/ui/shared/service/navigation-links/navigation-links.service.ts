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


    this.links['loginLink'] = '' +uuidV4();

    this.links['vrsLink'] = '/vrs/' +uuidV4();
    this.links['vrfLink'] = '/vrf/' +uuidV4();
    this.links['checkoutLink'] = '/user/checkout/' +uuidV4();
    this.links['salesLink'] = '/admin/sales/' +uuidV4();
    this.links['salesLink'] = '/admin/sales/' +uuidV4();

  }

  getLink(linkName: string): string {
    return this.links[linkName];
  }

  regenerateLinks(): void {
    this.generateLinks();
  }
}
