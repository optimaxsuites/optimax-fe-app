import { Injectable } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { MarketplaceService } from 'src/app/ui/marketplace/service/marketplace.service';

@Injectable({
  providedIn: 'root'
})
export class MenuItemsService {
  private menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-tachometer-alt',
      submenu: [
        { label: 'Communications', route: this.navigationLink.getLink('communicationsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-comments' },
        { label: 'Meetings & Appointments', route: this.navigationLink.getLink('meetingsAppointmentsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-calendar-check' },
      ],
    },
    {
      label: 'Sales',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('salesLink'),
      icon: 'fas fa-chart-line',
      locked: true,
      active: false

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
      locked: true,
      active: false

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
      route: this.navigationLink.getLink('INVLink'),
      icon: 'fas fa-boxes-stacking',
      locked: true,
      active: false
    },
    {
      label: 'Logistics',
      roles: ['ROLE_USER' , 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('LOGLink'),
      icon: 'fas fa-truck',
      locked: true,
      active: false
    },
    {
      label: 'Procurement',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('procurementLink'),
      icon: 'fas fa-shopping-cart',
      locked: true,
      active: false

      // submenu: [
      //   // { label: 'Request For Quotation', route: this.navigationLink.getLink('rfqLink'), roles: ['ROLE_USER'], icon: 'fas fa-file-alt' },
      //   // { label: 'Settings', route: this.navigationLink.getLink('procurementSettingsLink'), roles: ['ROLE_USER'], icon: 'pi pi-cog' },
      // ],
    },
    {
      label: 'Accounting',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-calculator',
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'fas fa-file-alt' },
      ],
      locked: true,
      active: false
    },
    {
      label: 'Human Resources',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      submenu: [
        { label: 'Employee Management', route: this.navigationLink.getLink('employeeManagementLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-cog' },
        { label: 'Recruitment', route: this.navigationLink.getLink('recuitmentLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
        { label: 'Project Management', route: this.navigationLink.getLink('performanceLink'), roles: ['ROLE_USER'], icon: 'fas fa-th-large' },
        { label: 'Payroll', route: this.navigationLink.getLink('payroll'), roles: ['ROLE_USER'], icon: 'fas fa-dollar-sign' },
        { label: 'Attendance', route: this.navigationLink.getLink('attendanceLink'), roles: ['ROLE_USER'], icon: 'fas fa-calendar-check' },
        { label: 'Leave', route: this.navigationLink.getLink('leaveLink'), roles: ['ROLE_USER'], icon: 'fas fa-calendar-minus' },
      ],
      locked: true,
      active: true

    },
    {
      label: 'Office Productivity',
      route: this.navigationLink.getLink('productivityLink'),

      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-file-alt',
      locked: true,
      active: true

    },
    {
      label: 'POS',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('posLink'),
      icon: 'fas fa-cash-register',
      locked: true,
      active: true,

      submenu: [
        { label: 'Product', route: this.navigationLink.getLink('productLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-box' },
        { label: 'Inventory', route: this.navigationLink.getLink('posInventoryLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-warehouse' },
        { label: 'Refunds', route: this.navigationLink.getLink('refundLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-receipt' },
        { label: 'Sales', route: this.navigationLink.getLink('posSaleLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-receipt' },
        { label: 'Checkout',roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-credit-card', route: this.navigationLink.getLink('checkoutLink'), },
        { label: 'Report', route: this.navigationLink.getLink('reportLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fa-solid fa-chart-pie' },
      ],
    },
    // {
    //   label: 'Checkout',
    //   roles: ['ROLE_USER', 'ROLE_ADMIN'],
    //   route: this.navigationLink.getLink('checkoutLink'),
    //   icon: 'fas fa-shopping-cart',
    //   locked: true,
    //   active: true

    
    // },
    {
      label: 'CRM',
      code: 'CRM',
      icon: 'fas fa-user-friends',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The CRM module of OptimaXSuites helps businesses manage customer interactions, relationships, and engagement strategies in one centralized place.',
      shortDescription: 'Track and manage customer interactions and relationships.',
      route: this.navigationLink.getLink('crmLink'),
      locked: true,
      active: false,
      submenu: [
        { label: 'Dashboard',    route: this.navigationLink.getLink('crmLink') + '/dashboard',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-tachometer-alt' },
        { label: 'Contacts',     route: this.navigationLink.getLink('crmLink') + '/contacts',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-address-book' },
        { label: 'Accounts',     route: this.navigationLink.getLink('crmLink') + '/accounts',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-building' },
        { label: 'Pipeline',     route: this.navigationLink.getLink('crmLink') + '/pipeline',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-stream' },
        { label: 'Leads',        route: this.navigationLink.getLink('crmLink') + '/leads',       roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-crosshairs' },
        { label: 'Campaigns',    route: this.navigationLink.getLink('crmLink') + '/campaigns',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-bullhorn' },
        { label: 'Activities',   route: this.navigationLink.getLink('crmLink') + '/activities',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-calendar-alt' },
        { label: 'Quotes & CPQ', route: this.navigationLink.getLink('crmLink') + '/quotes',      roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-invoice' },
        { label: 'Contracts',    route: this.navigationLink.getLink('crmLink') + '/contracts',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-contract' },
        { label: 'Support',      route: this.navigationLink.getLink('crmLink') + '/tickets',     roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-headset' },
        { label: 'Reports',      route: this.navigationLink.getLink('crmLink') + '/reports',     roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-chart-bar' },
        { label: 'Automation',   route: this.navigationLink.getLink('crmLink') + '/automation',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-bolt' },
        { label: 'Government',   route: this.navigationLink.getLink('crmLink') + '/government',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-landmark' },
        { label: 'Commissions',  route: this.navigationLink.getLink('crmLink') + '/commission',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-money-bill-wave' },
        { label: 'CRM Settings', route: this.navigationLink.getLink('crmLink') + '/settings',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-cog' },
      ],
    },
    {
      label: 'Expense',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('expensesLink'),
      icon: 'fas fa-money-bill-wave',
      locked: true,
      active: false

      // submenu: [
      //   // { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
      //   // { label: 'Reimbursements', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
      //   // { label: 'Retirement', route: "", roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },

      // ],
    },
    {
      label: 'Tender',
      route: this.navigationLink.getLink('tenderLink'),

      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-file-alt',
      locked: true,
      active: false

    },
    {
      label: 'Vendor',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-user-tie',
      route: this.navigationLink.getLink('vendorLink'),
      locked: true,
      active: false
    },
    {
      label: 'Vendor Management',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-building-user',
      route: this.navigationLink.getLink('VMLink'),
      locked: true,
      active: true,
      submenu: [
        { label: 'All Vendors', route: this.navigationLink.getLink('VMLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-list' },
        { label: 'Onboarding', route: this.navigationLink.getLink('VMLink') + '/onboarding', roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-user-plus' },
      ],
    },
    {
      label: 'Settings',
      route: this.navigationLink.getLink('settingsLink'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-sliders-h',
      locked: true
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
        { label: 'Request For Quotation', route: this.navigationLink.getLink('commerceRequestsLink'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
        { label: 'Settings', route: this.navigationLink.getLink('procurementSettingsLink'), roles: ['ROLE_USER'], icon: 'pi pi-cog' },
      ],
    },
    {
      label: 'Finance',
      code: 'Accounting',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('accountingLink'),
      icon: 'pi pi-credit-card',
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
        { label: 'Biometric Devices', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'biometric-devices' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-id-card' },
        { label: 'Manufacturer Integrations', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'biometric-integrations' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-plug' },

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
      route: this.navigationLink.getLink('crmLink') + '/settings',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-users',
      submenu: [
        { label: 'Dashboard',    route: this.navigationLink.getLink('crmLink') + '/dashboard',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-home' },
        { label: 'Contacts',     route: this.navigationLink.getLink('crmLink') + '/contacts',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-user' },
        { label: 'Accounts',     route: this.navigationLink.getLink('crmLink') + '/accounts',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-building' },
        { label: 'Pipeline',     route: this.navigationLink.getLink('crmLink') + '/pipeline',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-bars' },
        { label: 'Leads',        route: this.navigationLink.getLink('crmLink') + '/leads',       roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-bolt' },
        { label: 'Campaigns',    route: this.navigationLink.getLink('crmLink') + '/campaigns',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-megaphone' },
        { label: 'Activities',   route: this.navigationLink.getLink('crmLink') + '/activities',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-calendar' },
        { label: 'Quotes & CPQ', route: this.navigationLink.getLink('crmLink') + '/quotes',      roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file' },
        { label: 'Contracts',    route: this.navigationLink.getLink('crmLink') + '/contracts',   roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-file-edit' },
        { label: 'Support',      route: this.navigationLink.getLink('crmLink') + '/tickets',     roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-headphones' },
        { label: 'Reports',      route: this.navigationLink.getLink('crmLink') + '/reports',     roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-chart-bar' },
        { label: 'Automation',   route: this.navigationLink.getLink('crmLink') + '/automation',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-cog' },
        { label: 'Government',   route: this.navigationLink.getLink('crmLink') + '/government',  roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-globe' },
        { label: 'CRM Settings', route: this.navigationLink.getLink('crmLink') + '/settings',    roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-wrench' },
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

  appList  = []
  private unlockedModules$ = new BehaviorSubject<MenuItem[]>([]);

  constructor(public navigationLink: NavigationLinksService, private marketPlaceService: MarketplaceService) {
    this.refreshRegisteredApps();
  }

  refreshRegisteredApps(): void {
    const token = this.currentToken();
  if (token) {
    this.marketPlaceService.getRegisteredApp().subscribe({
      next: (app: any) => {
        this.appList = app;
        this.loadUnlockedModules(); 
        this.loadUnlockedSettingsModules();
      },
      error: (error: any) => {
        console.error('Error fetching app data:', error);
      }
    });
  } else {
    console.log('No token yet — skipping app registration fetch');
  }
  }

  private currentToken(): string {
    return (
      sessionStorage.getItem('Token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('Token2') ||
      localStorage.getItem('token') ||
      ''
    );
  }
  

  getMenuItemsForRole(role: string): MenuItem[] {
    return this.menuItems.filter(item => item.roles.includes(role));
  }

  getSettingsMenuItemsForRole(role: string): MenuItem[] {
    return this.settingsMenuItems.filter(item => item.roles.includes(role));
  }

  unlockModule(label: string) {
    const module = this.menuItems.find(m => m.label === label);
    if (module) {
      module.locked = false;
      if(module.label === "POS"){
        const checkoutModule = this.menuItems.find(module => module.label === 'Checkout');
        if (checkoutModule) {
          checkoutModule.locked = false;
        }
      }
      this.saveUnlockedModules(); 
      // this.unlockedModules$.next(this.getUnlockedModules());

    }
  }

  private saveUnlockedModules() {
    const unlockedRoutes = this.menuItems.filter(m => !m.locked).map(m => m.label);
    localStorage.setItem('unlockedModules', JSON.stringify(unlockedRoutes));
  }

  loadUnlockedModules() {
    const unlockedRoutes = this.appList.map((app : {appName : string}) => app.appName)
    // const unlockedRoutes = JSON.parse(localStorage.getItem('unlockedModules') || '[]');
    console.log(unlockedRoutes)
    
    let unlockedCount = 0;
  
    this.menuItems.forEach(module => {
      if (unlockedRoutes.includes(module.label)) {
        module.locked = false;
  
        if (module.label !== 'Dashboard') {
          unlockedCount++;
        }
      }
    });
  
    if (unlockedCount > 0) {
      const settingsModule = this.menuItems.find(module => module.label === 'Settings');
      if (settingsModule) {
        settingsModule.locked = false;
      }
    }

    this.unlockedModules$.next(this.getUnlockedModules());
  }

  loadUnlockedSettingsModules() {
    // const unlockedRoutes = JSON.parse(localStorage.getItem('unlockedModules') || '[]');
    const unlockedRoutes = this.appList.map((app : {appName : string}) => app.appName)
    
  
    this.settingsMenuItems.forEach(module => {
      if (unlockedRoutes.includes(module.label)) {
        module.locked = false;
      }
    });

  }
  
  getUnlockedModules(): MenuItem[] {
    let unlockedModules = this.menuItems.filter(module => !module.locked || module.label === 'Dashboard');
  
    const hasUnlockedModule = unlockedModules.some(module => module.label !== 'Dashboard');
  
    if (hasUnlockedModule) {
      unlockedModules = unlockedModules.map(module =>
        module.label === 'Settings' ? { ...module, locked: false } : module
      );
    }
  
    return unlockedModules;
   
  }
  
  getUnlockedSettingsModules(): MenuItem[] {
    let unlockedModules = this.settingsMenuItems.filter(module => !module.locked || module.label === 'Dashboard');
    return unlockedModules;
  }
  
  getAllModules() {
    return this.menuItems.filter(module => module.label !== 'Dashboard' && module.label !== 'Settings' && module.label !== 'Checkout');
  }

  getUnlockedModulesObservable() {
    return this.unlockedModules$.asObservable();
  }
}
