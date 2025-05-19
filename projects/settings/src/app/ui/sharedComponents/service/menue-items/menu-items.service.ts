import { Injectable } from '@angular/core';
import { MenuItem } from '../../domain/menuItem.dto';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { AppRegisterServiceService } from '../app-register-service.service';

@Injectable({
  providedIn: 'root'
})
export class MenuItemsService {
  private menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      route: this.navigationLink.getLink('dashboardLink'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-tachometer-alt',
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
      route: this.navigationLink.getLink('inventoryLink'),
      icon: 'fas fa-box',
      locked: true,
      active: false

      // submenu: [
      //   { label: 'User Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-users' },
      //   { label: 'Product Management', route: "", roles: ['ROLE_USER'], icon: 'pi pi-box' },
      // ],
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
      icon: 'fas fa-calculator', // PrimeNG icon class
      submenu: [
        { label: 'Quotation', route: this.navigationLink.getLink('accountingLink'), roles: ['ROLE_USER'], icon: 'fas fa-file-alt' },
        // { label: 'Invoice', route: "", roles: ['ROLE_USER'], icon: 'pi pi-file' },
      ],
      locked: true,
      active: true,
      code: "ACCOUNT"
    },
    {
      label: 'Human Resources',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      code: 'HR',
      submenu: [
        { label: 'Employee Management', route: this.navigationLink.getLink('employeeManagementLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-cog' },
        { label: 'Recruitment', route: this.navigationLink.getLink('recuitmentLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
        { label: 'Performance', route: this.navigationLink.getLink('performanceLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-clock' },
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
      code: 'OP',

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
      code: 'POS',

      submenu: [
        { label: 'Product', route: this.navigationLink.getLink('productLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-box' },
        { label: 'Inventory', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-warehouse' },
        { label: 'Ingredients', route: this.navigationLink.getLink('ingredientLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-warehouse' },
        { label: 'Refunds', route: this.navigationLink.getLink('refundLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-receipt' },
        { label: 'Sales', route: this.navigationLink.getLink('salesLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-receipt' },
        { label: 'Checkout',roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-credit-card', route: this.navigationLink.getLink('checkoutLink'), },
        { label: 'Report', route: this.navigationLink.getLink('reportLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fa-solid fa-chart-pie' },
      ],
    },
    {
      label: 'Hospitality',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      code: 'HOP',
      submenu: [
        { label: 'Room', route: this.navigationLink.getLink('roomLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-cog' },
        { label: 'Shortlets', route: this.navigationLink.getLink('shortletLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
        { label: 'Services', route: this.navigationLink.getLink('serviceLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-clock' },
        { label: 'Rooms Checkout',roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-credit-card', route: this.navigationLink.getLink('roomsCheckoutLink'), },
        { label: 'Services Checkout',roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'pi pi-credit-card', route: this.navigationLink.getLink('servicesCheckoutLink'), },


      ],
      locked: true,
      active: true

    },
    {
      label: 'CRM',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('crmLink'),
      icon: 'fas fa-user-friends',
      locked: true,
      active: false

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
      locked: true,
      active: true,
      code: 'expense',


      submenu: [
        { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
        { label: 'Reimbursements', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },
        { label: 'Retirement', route: "", roles: ['ROLE_USER'], icon: 'pi pi-credit-card' },

      ],
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

      // submenu: [
      //   { label: 'Registration', route: this.navigationLink.getLink('vendorLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-plus' },
      //   { label: 'Incoming RFQ ', route: this.navigationLink.getLink('vendorRfqLink'), roles: ['ROLE_USER'], icon: 'fas fa-inbox' },
      // ],
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
      label: 'Hospitality',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      route: this.navigationLink.getLink('HOSSettings'),

      submenu: [
   
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
      label: 'Office Productivity',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('officeSet'),

      icon: 'pi pi-shopping-bag', 
      submenu: [
        { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
       
      ],
    },
    {
      label: 'User and Roles Management',
      route: this.navigationLink.getLink('userRoles'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-check', 
      submenu: [
        { label: 'Order Summary', route: this.navigationLink.getLink('userRoles'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
 
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

  appList  = []
  private unlockedModules$ = new BehaviorSubject<MenuItem[]>([]);
  private modulesRolePermissions = [
    {
      name: 'POS',
      forms: ['product','report', 'sales', 'inventory', 'checkout']
    },
    {
      name: 'Human Resources',
      forms: ['employee','recruitment', 'Job vacancy', 'leave', 'loan', 'attendance', 'payroll']
    },
    {
      name: 'Office Productivity',
      forms: ['project','task']
    },
  ]
  private settingsMenuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  settingsMenuItems$ = this.settingsMenuItemsSubject.asObservable(); 
  // private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  // menuItems$ = this.menuItemsSubject.asObservable(); 


  constructor(public navigationLink: NavigationLinksService, private appRegisterService: AppRegisterServiceService) {
    this.appRegisterService.getRegisteredApp().subscribe({
      next: (app: any) => {
        this.appList = app
        this.loadUnlockedModules(); 
        this.loadUnlockedSettingsModules()
        console.log(this.appList)
      },
      error: (error: any) => {
        console.error('Error fetching app data:', error);
      }
    })
      
    
    
  
   
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
    const unlockedRoutes = this.appList.map((app : {description : string}) => app.description)
    // const unlockedRoutes = JSON.parse(localStorage.getItem('unlockedModules') || '[]');
    console.log(unlockedRoutes)
    
    let unlockedCount = 0;
  
    this.menuItems.forEach(module => {
      if (unlockedRoutes.includes(module.label)) {
        console.log(true)
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
    const unlockedRoutes = this.appList.map((app : {description : string}) => app.description)
    console.log(unlockedRoutes)
  
    this.settingsMenuItems.forEach((module) => {
      if (module.label === 'General Settings' || module.label === 'User and Roles Management') {
        module.locked = false; 
      } else {
        module.locked = !unlockedRoutes.includes(module.label);
      }
    });

    console.log('Updated Settings Menu:', this.settingsMenuItems);
    this.settingsMenuItemsSubject.next([...this.settingsMenuItems]); 

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

  getUnlockedModulesRole(){
    let unlockedModules = this.settingsMenuItems.filter(module => !module.locked);
    return this.modulesRolePermissions.filter(module => unlockedModules.some(m => m.label === module.name))
  }

  getUnlockedSettingsModules(){
    // console.log(this.settingsMenuItems)
    // let unlockedModules = this.settingsMenuItems.filter(module => !module.locked || module.label === 'Dashboard');
    // console.log(unlockedModules)
    // return unlockedModules;
    return this.settingsMenuItems$.pipe(
      map((menuItems) => menuItems.filter((item) => !item.locked || item.label === 'Dashboard'))
    );
  }
  
  getAllModules() {
    return this.menuItems.filter(module => module.label !== 'Dashboard' && module.label !== 'Settings' && module.label !== 'Checkout');
  }

  getUnlockedModulesObservable() {
    return this.unlockedModules$.asObservable();
  }
}
