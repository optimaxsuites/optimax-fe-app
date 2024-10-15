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
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-tachometer-alt'
    },
    {
      label: 'Sales',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('salesLink'),
      icon: 'fas fa-chart-line',
      // submenu: [
      //   { label: 'Quotation', , roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Proforma Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Dispatch Note', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      // ],
    },
    {
      label: 'Purchase',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('purchaseLink'),
      icon: 'fas fa-shopping-bag',
      // submenu: [
      //   // { label: 'Request For Quotation', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Proforma Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Dispatch Note', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      // ],
    },
    {
      label: 'Inventory',
      roles: ['ROLE_USER' , 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('inventoryLink'),
      icon: 'fas fa-box',
      // submenu: [
      //   { label: 'User Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-users' },
      //   { label: 'Product Management', route: "", roles: ['ROLE_USER'], icon: 'pi pi-box' },
      // ],
    },
    {
      label: 'Procurement',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-shopping-cart',
      submenu: [
        { label: 'Request For Quotation', route: this.navigationLink.getLink('rfqLink'), roles: ['ROLE_USER'], icon: 'fas fa-file-alt' },
        // { label: 'Settings', route: this.navigationLink.getLink('procurementSettingsLink'), roles: ['ROLE_USER'], icon: 'pi pi-cog' },
      ],
    },
    {
      label: 'Accounting',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-calculator', // PrimeNG icon class
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'fas fa-file-alt' },
        // { label: 'Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Human Resources',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      submenu: [
        { label: 'Employee Management', route: this.navigationLink.getLink('employeeManagementLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-cog' },
        { label: 'Recruitment', route: this.navigationLink.getLink('recuitmentLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
        { label: 'Interview', route: this.navigationLink.getLink('interviewLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-clock' },
        { label: 'Payroll', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'fas fa-dollar-sign' },
        { label: 'Attendance', route: this.navigationLink.getLink('attendanceLink'), roles: ['ROLE_USER'], icon: 'fas fa-calendar-check' },
        { label: 'Leave', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'fas fa-calendar-minus' },
      ],
    },
    {
      label: 'POS',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('posLink'),
      icon: 'fas fa-cash-register',
      // submenu: [
      //   // { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
      //   // { label: 'Transactions', route: "", roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      // ],
    },
    {
      label: 'Checkout',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('checkoutLink'),
      icon: 'fas fa-shopping-cart',
      // submenu: [
      //   // { label: 'Order Summary', route: this.navigationLink.getLink('checkoutLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
      //   // { label: 'Payment Details', route: "", roles: ['ROLE_USER'], icon: 'pi pi-wallet' },
      // ],
    },
    {
      label: 'CRM',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('crmLink'),
      icon: 'fas fa-user-friends',
      // submenu: [
      //   // { label: 'Contacts', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
      //   // { label: 'Opportunities', route: "", roles: ['ROLE_USER'], icon: 'pi pi-briefcase' },
      // ],
    },
    {
      label: 'Expense',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('expensesLink'),
      icon: 'fas fa-money-bill-wave',
      // submenu: [
      //   // { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
      //   // { label: 'Reimbursements', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      //   // { label: 'Retirement', route: "", roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },

      // ],
    },
    {
      label: 'Tender',
      // route: ,
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-file-alt'
    },
    {
      label: 'Vendor',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-user-tie', // PrimeNG icon class
      submenu: [
        { label: 'Registration', route: this.navigationLink.getLink('vendorLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
        { label: 'Incoming RFQ ', route: this.navigationLink.getLink('vendorRfqLink'), roles: ['ROLE_USER'], icon: 'fas fa-inbox' },
      ],
    },
    {
      label: 'Settings',
      route: this.navigationLink.getLink('settingsLink'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-sliders-h' // PrimeNG icon class
    },
  ];





  private settingsMenuItems: MenuItem[] = [
    {
      label: 'General Settings',
      route: this.navigationLink.getLink('generalSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-home',
      submenu: [
        { label: 'Profile', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
        { label: 'Security', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Sales',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('salesSettings'),
      icon: 'pi pi-dollar', 
      submenu: [
        { label: 'Profile', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
        { label: 'Security', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Purchase',
      route: this.navigationLink.getLink('purchaseSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-shopping-cart', 
      submenu: [
        { label: 'Profile', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
        { label: 'Security', route: this.navigationLink.getLink('purchaseLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Inventory',
      roles: ['ROLE_USER' , 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('inventorySettings'),

      icon: 'pi pi-cog',
      submenu: [
        { label: 'User Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-users' },
      ],
    },
    {
      label: 'Procurement',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('vendorSettings'),

      icon: 'pi pi-truck', 
      submenu: [
        { label: 'Request For Quotation', route: this.navigationLink.getLink('rfqLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Settings', route: this.navigationLink.getLink('procurementSettingsLink'), roles: ['ROLE_USER'], icon: 'pi pi-cog' },
      ],
    },
    {
      label: 'Accounting',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('accountSettings'),

      icon: 'pi pi-credit-card', 
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        // { label: 'Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
    },
    {
      label: 'Human Resources',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('HRSettings'),

      icon: 'pi pi-users', 
      submenu: [
        { label: 'Recruitment', route: this.navigationLink.getLink('recuitmentLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
        { label: 'Interview', route: this.navigationLink.getLink('interviewLink'), roles: ['ROLE_USER'], icon: 'pi pi-check' },
        { label: 'Attendance', route: this.navigationLink.getLink('attendanceLink'), roles: ['ROLE_USER'], icon: 'pi pi-check' },
        { label: 'Leave', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
        { label: 'Score Sheet', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },

      ],
    },
    {
      label: 'POS',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('posSettings'),

      icon: 'pi pi-shopping-bag', 
      submenu: [
        { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
       
      ],
    },
    {
      label: 'Checkout',
      route: this.navigationLink.getLink('checkoutSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-check', 
      submenu: [
        { label: 'Order Summary', route: this.navigationLink.getLink('checkoutLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
 
      ],
    },
    {
      label: 'CRM',
      route: this.navigationLink.getLink('CRMSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-users', 
      submenu: [
        { label: 'Contacts', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
       
      ],
    },
    {
      label: 'Expense',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('expenseSettings'),

      icon: 'pi pi-money-bill', 
      submenu: [
        { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
 

      ],
    },
    {
      label: 'Tender',
      route: this.navigationLink.getLink('tenderSettings'),

      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-user' 
    },
    {
      label: 'Vendor',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-money-bill',
      route: this.navigationLink.getLink('vendorSettings'),
      submenu: [
        { label: 'View 1', route: this.navigationLink.getLink('vendorLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
        { label: 'Incoming RFQ ', route: this.navigationLink.getLink('vendorRfqLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      ],
    },
    {
      label: 'User Management',
      route: this.navigationLink.getLink('userManagmentSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-cog' 
    },
  ];

  constructor(public navigationLink: NavigationLinksService) {}

  getMenuItemsForRole(role: string): MenuItem[] {
    return this.menuItems.filter(item => item.roles.includes(role));
  }

  getSettingsMenuItemsForRole(role: string): MenuItem[] {
    return this.settingsMenuItems.filter(item => item.roles.includes(role));
  }
}
