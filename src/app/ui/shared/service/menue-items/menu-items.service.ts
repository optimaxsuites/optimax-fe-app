import { Injectable } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class MenuItemsService {
  private menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      route: this.navigationLink.getLink('dashboardLink'),
      roles: ['ROLE_USER'],
      icon: 'pi pi-home' // PrimeNG icon class
    },
    {
      label: 'Sales',
      roles: ['ROLE_USER'],
      icon: 'pi pi-dollar', // PrimeNG icon class
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('salesLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Invoice', route: this.navigationLink.getLink('salesLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Proforma Invoice', route: this.navigationLink.getLink('salesLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Dispatch Note', route: this.navigationLink.getLink('salesLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Purchase',
      roles: ['ROLE_USER'],
      icon: 'pi pi-shopping-cart', // PrimeNG icon class
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Invoice', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Proforma Invoice', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Dispatch Note', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Inventory',
      roles: ['ROLE_USER'],
      icon: 'pi pi-cog', // PrimeNG icon class
      submenu: [
        { label: 'User Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-users' },
        { label: 'Product Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-box' },
      ],
    },
    {
      label: 'Procurement',
      roles: ['ROLE_USER'],
      icon: 'pi pi-truck', // PrimeNG icon class
      submenu: [
        { label: 'Request For Quotation', route: this.navigationLink.getLink('rfqLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Settings', route: this.navigationLink.getLink('procurementSettingsLink'), roles: ['ROLE_USER'], icon: 'pi pi-cog' },
      ],
    },
    {
      label: 'Accounting',
      roles: ['ROLE_USER'],
      icon: 'pi pi-credit-card', // PrimeNG icon class
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Invoice', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Human Resources',
      roles: ['ROLE_USER'],
      icon: 'pi pi-users', // PrimeNG icon class
      submenu: [
        { label: 'Recuitment', route: this.navigationLink.getLink('recuitmentLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
        { label: 'Attendance', route: this.navigationLink.getLink('attendanceLink'), roles: ['ROLE_USER'], icon: 'pi pi-check' },
        { label: 'Leave', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },

      ],
    },
    {
      label: 'POS',
      roles: ['ROLE_USER'],
      icon: 'pi pi-shopping-bag', // PrimeNG icon class
      submenu: [
        { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
        { label: 'Transactions', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      ],
    },
    {
      label: 'Checkout',
      roles: ['ROLE_USER'],
      icon: 'pi pi-check', // PrimeNG icon class
      submenu: [
        { label: 'Order Summary', route: this.navigationLink.getLink('checkoutLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Payment Details', route: this.navigationLink.getLink('checkoutLink'), roles: ['ROLE_USER'], icon: 'pi pi-wallet' },
      ],
    },
    {
      label: 'CRM',
      roles: ['ROLE_USER'],
      icon: 'pi pi-users', // PrimeNG icon class
      submenu: [
        { label: 'Contacts', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
        { label: 'Opportunities', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER'], icon: 'pi pi-briefcase' },
      ],
    },
    {
      label: 'Expense',
      roles: ['ROLE_USER'],
      icon: 'pi pi-money-bill', // PrimeNG icon class
      submenu: [
        { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
        { label: 'Reimbursements', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
        { label: 'Retirement', route: "", roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },

      ],
    },
    {
      label: 'Vendor',
      roles: ['ROLE_USER'],
      icon: 'pi pi-money-bill', // PrimeNG icon class
      submenu: [
        { label: 'View 1', route: this.navigationLink.getLink('vendorLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
        { label: 'Incoming RFQ ', route: this.navigationLink.getLink('vendorRfqLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      ],
    },
    {
      label: 'Settings',
      route: this.navigationLink.getLink('settingsLink'),
      roles: ['ROLE_USER'],
      icon: 'pi pi-cog' // PrimeNG icon class
    },
  ];


  constructor(public navigationLink: NavigationLinksService) {}

  getMenuItemsForRole(role: string): MenuItem[] {
    return this.menuItems.filter(item => item.roles.includes(role));
  }
}
