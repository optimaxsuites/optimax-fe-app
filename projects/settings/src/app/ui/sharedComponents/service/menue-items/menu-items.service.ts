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
      code: 'dashboard',
      route: this.navigationLink.getLink('dashboardLink'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-tachometer-alt',
      submenu: [
        {
          label: 'Communications',
          code: 'DASH_COMM',
          route: this.navigationLink.getLink('dashboardLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'View and manage communications across the organization.'
        },
        {
          label: 'OptimaXAI',
          code: 'OPTIMA_AI',
          route: this.navigationLink.getLink('optimaXAILink'), 
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'optimax business artificial intelligence.'
        },
        {
          label: 'Analytics',
          code: 'DASH_ANALY',
          route: this.navigationLink.getLink('analyticsLink'), 
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'BUSINESS ANALYTICS.'
        }
      ]
    },
    {
      label: 'Sales',
      code: 'SALES',
      route: this.navigationLink.getLink('salesLink'),
      icon: 'fas fa-chart-line',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Sales module of OptimaXSuites enables businesses to manage and track customer sales activities, revenue generation, and sales performance analytics.',
      shortDescription: 'Track customer sales, revenue, and performance metrics.',
      locked: true,
      active: false
    },    
    {
      label: 'Purchase',
      code: 'PURCHASE',
      route: this.navigationLink.getLink('purchaseLink'),
      icon: 'fas fa-shopping-bag',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Purchase module of OptimaXSuites helps manage purchase orders, supplier interactions, and buying processes efficiently.',
      shortDescription: 'Manage purchase orders and buying activities.',
      locked: true,
      active: false
    },    
    {
      label: 'Inventory',
      code: 'INVENTORY',
      route: this.navigationLink.getLink('inventoryLink'),
      icon: 'fas fa-box',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Inventory module of OptimaXSuites enables tracking, management, and optimization of stock levels across locations.',
      shortDescription: 'Track and manage stock levels and inventory flow.',
      locked: true,
      active: false
    },    
    {
      label: 'Procurement',
      code: 'optimaXProcurement',
      route: this.navigationLink.getLink('procurementLink'),
      icon: 'fas fa-shopping-cart',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Procurement module of OptimaXSuites supports the end-to-end process of requisitions, supplier selection, and order processing.',
      shortDescription: 'Manage requisitions, supplier selection, and procurement workflows.',
      locked: true,
      active: true,
      submenu: [
        {
          label: 'PR Management',
          code: 'PR_MGMT',
          route: this.navigationLink.getLink('procurementLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'View and manage procurements across the organization.'
        },
        {
          label: 'Vendor management ',
          code: 'VENDOR_MGMT',
          route: this.navigationLink.getLink('vendorManagementLink'), 
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'Manage vendor profiles, contracts, and supplier relationships.'
        },
        {
          label: 'Vendor',
          code: 'PR_VENDOR',
          route: this.navigationLink.getLink('vendorLink'), 
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'View vendor details and manage vendor relationships.'
        },
        {
          label: 'RFQs',
          code: 'PR_RFQ',
          route: this.navigationLink.getLink('rfqLink'), 
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'Manage RFQs and vendor responses.'
        },
        {
          label: 'Quotations',
          code: 'PR_QUOTE',
          route: this.navigationLink.getLink('quotationLink'), 
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'View and manage vendor quotations.'
        },
        {
          label: 'LPO',
          code: 'PR_LPO',
          route: this.navigationLink.getLink('lpoLink'), 
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'View and manage LPOs.'
        }
      ]
    },    
    {
      label: 'Accounting',
      code: 'Accounting',
      icon: 'fas fa-calculator',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Accounting module of OptimaXSuites provides tools for managing financial transactions, ledgers, reconciliations, and generating financial reports.',
      shortDescription: 'Manage financial records, ledgers, and accounting reports.',
      locked: true,
      active: true,
      submenu: [
        {
          label: 'Transactions',
          code: 'ACCT_TXN',
          route: this.navigationLink.getLink('transactionLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'View and manage financial transactions across the organization.'
        },
        {
          label: 'General ledger',
          code: 'ACCT_GL',
          route: this.navigationLink.getLink(''), 
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-alt',
          description: 'Maintain and review the general ledger for accurate financial reporting.'
        },
        {
          label: 'Reconciliation',
          code: 'ACCT_RECON',
          route: this.navigationLink.getLink('reconciliationLink'), 
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'Match financial records with bank statements for reconciliation purposes.'
        },
        {
          label: 'Reports',
          code: 'ACCT_REPTS',
          route: this.navigationLink.getLink('accountingReportLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-file',
          description: 'Generate various financial statements and reports for analysis.'
        }
      ]
    },    
    {
      label: 'Human Resources',
      code: 'HR',
      icon: 'fas fa-users',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Human Resources module of OptimaXSuites enables organizations to efficiently manage the employee lifecycle, from recruitment to payroll, leave, and performance tracking.',
      shortDescription: 'Manage employee data, recruitment, payroll, and performance.',
      locked: true,
      active: true,
      submenu: [
         {
        label: 'My Dashboard',
        code: 'HR_EMP_ME',
        route: this.navigationLink.getLink('employeeDashboardLink'),
        roles: ['ROLE_USER', 'ROLE_ADMIN'],
        icon: 'fas fa-user-circle',
        doNotRegisterAsPermission: true
      },
        {
          label: 'Employee Management',
          code: 'HR_EMP_MG',
          route: this.navigationLink.getLink('employeeManagementLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-cog',
          description: 'Manage employee profiles, job roles, departments, and organizational structure.'
        },
        {
          label: 'Recruitment',
          code: 'HR_RECRUIT',
          route: this.navigationLink.getLink('recuitmentLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-plus',
          description: 'Handle job postings, candidate applications, interview schedules, and hiring decisions.'
        },
        { label: 'Project', 
          code: 'HR_PROJECT',
           route: this.navigationLink.getLink('projectLink'), roles: ['ROLE_USER'], icon: 'fas fa-user-check' },
        {
          label: 'Performance',
          code: 'HR_PERF',
          route: this.navigationLink.getLink('performanceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Monitor employee performance, set goals, and conduct evaluations.'
        },
        {
          label: 'Query',
          code: 'HR_QUERY',
          route: this.navigationLink.getLink('queryLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-question-circle',
          description: 'Manage queries and support tickets raised by employees.'
        },
        {
          label: 'Work Schedule',
          code: 'HR_WORK_SCH',
          route: this.navigationLink.getLink('workScheduleLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Monitor employee performance, set goals, and conduct evaluations.'
        },
        {
          label: 'Payroll',
          code: 'HR_PAYROLL',
          route: this.navigationLink.getLink('payroll'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-dollar-sign',
          description: 'Process employee salaries, bonuses, deductions, and payslips.'
        },
        {
          label: 'Contribution and Loans',
          code: 'HR_ADVANCE',
          route: this.navigationLink.getLink('advance'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-dollar-sign',
          description: 'Process employee advances and manage advance requests.'
        },
        {
          label: 'Attendance',
          code: 'HR_ATTEND',
          route: this.navigationLink.getLink('attendanceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-calendar-check',
          description: 'Track employee attendance, working hours, and absenteeism.'
        },
        {
          label: 'Leave',
          code: 'HR_LEAVE',
          route: this.navigationLink.getLink('leaveLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-calendar-minus',
          description: 'Manage leave requests, approvals, balances, and policies.'
        }
      ]
    },    
    {
      label: 'Office Productivity',
      code: 'OP',
      route: this.navigationLink.getLink('productivityLink'),
      icon: 'fas fa-file-alt',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Office Productivity module of OptimaXSuites provides tools and integrations to enhance daily work efficiency, document collaboration, scheduling, and internal communication.',
      shortDescription: 'Boost team efficiency with tools for documents, scheduling, and collaboration.',
      locked: true,
      active: true
    },    
    {
      label: 'Point of Sale (POS)',
      code: 'optimaXPOS',
      icon: 'fas fa-cash-register',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The POS (Point of Sale) module of OptimaXSuites provides a comprehensive system for managing retail operations including products, inventory, sales, and customer checkout.',
      shortDescription: 'Manage retail sales, inventory, checkout, and reporting.',
      route: this.navigationLink.getLink('posLink'),
      locked: true,
      active: true,
      submenu: [
        {
          label: 'Product',
          code: 'POS_PDT',
          route: this.navigationLink.getLink('productLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-box',
          description: 'Create, update, and categorize products available for sale.'
        },
        {
          label: 'Inventory',
          code: 'POS_INV',
          route: this.navigationLink.getLink('inventoryLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-warehouse',
          description: 'Manage stock levels, warehouse items, and inventory adjustments.'
        },
        // {
        //   label: 'Ingredients',
        //   code: 'POS_ING',
        //   route: this.navigationLink.getLink('ingredientLink'),
        //   roles: ['ROLE_USER', 'ROLE_ADMIN'],
        //   icon: 'pi pi-warehouse',
        //   description: 'Track and manage raw materials or ingredients used in product creation.'
        // },
        {
          label: 'Refunds',
          code: 'POS_RFND',
          route: this.navigationLink.getLink('refundLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-receipt',
          description: 'Handle refund transactions and maintain refund history.'
        },
        {
          label: 'Sales',
          code: 'POS_SALES',
          route: this.navigationLink.getLink('salesLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-receipt',
          description: 'View and manage sales records, transactions, and revenue data.'
        },
        {
          label: 'Optimerce Sales',
          code: 'POS_ESALES',
          route: this.navigationLink.getLink('esalesLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-receipt',
          description: 'View and manage sales records, transactions, and revenue data.'
        },
        {
          label: 'Checkout',
          code: 'POS_CHKOUT',
          route: this.navigationLink.getLink('checkoutLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-credit-card',
          description: 'Process payments and manage the customer checkout flow.'
        },
        {
          label: 'Kitchen',
          code: 'POS_KITCHEN',
          route: this.navigationLink.getLink('kitchenLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-credit-card',
          description: 'Process payments and manage the customer checkout flow.',
          doNotRegisterAsPermission: true
        },
        {
          label: 'Kitchen Order Operations',
          code: 'POS_KITCHEN_ORDER', 
          route: "",
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: "",
          description: 'Permission to view kitchen order screens.',
          isNotSidebarItem: true 
        },
        {
          label: 'Kitchen Cashier Operations',
          code: 'POS_KITCHEN_CASHIER', 
          route: "", 
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: "",
          description: 'Permission to perform till management and checkout tasks.',
          isNotSidebarItem: true 
        },
        {
          label: 'Kitchen Waiter Operations',
          code: 'POS_KITCHEN_WAITER',
          route: "",
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: "",
          description: 'Permission to manage table orders and serving tasks.',
          isNotSidebarItem: true 
        },
        {
          label: 'Optimerce',
          code: 'POS_STORE',
          route: this.navigationLink.getLink('storeLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-credit-card',
          description: 'Process payments and manage the customer checkout flow.'
        },
        {
          label: 'Report',
          code: 'POS_REPRT',
          route: this.navigationLink.getLink('reportLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fa-solid fa-chart-pie',
          description: 'Generate sales and inventory reports for business insights and analytics.'
        }
      ]
    },    
    {
      label: 'Hospitality',
      code: 'optimaXHospitality',
      icon: 'fas fa-users',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Hospitality module of OptimaXSuites provides tools to manage room bookings, shortlet accommodations, and additional service offerings, including their checkout processes.',
      shortDescription: 'Manage room bookings, shortlets, and hospitality services.',
      locked: true,
      active: true,
      submenu: [
        {
          label: 'Room',
          code: 'HOP_ROOM',
          route: this.navigationLink.getLink('roomLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-cog',
          description: 'Manage hotel room types, availability, rates, and reservations.'
        },
        {
          label: 'Services',
          code: 'HOP_SERV',
          route: this.navigationLink.getLink('serviceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Manage add-on services such as laundry, room service, or extra amenities.'
        },
        {
          label: 'Guests',
          code: 'HOP_GUEST',
          route: this.navigationLink.getLink('guestLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Manage add-on services such as laundry, room service, or extra amenities.'
        },
        {
          label: 'Payment',
          code: 'HOP_PAY',
          route: this.navigationLink.getLink('payLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Manage add-on services such as laundry, room service, or extra amenities.'
        },
        {
          label: 'House Keeping',
          code: 'HOP_PAY',
          route: this.navigationLink.getLink('HKLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-clock',
          description: 'Manage add-on services such as laundry, room service, or extra amenities.'
        },
        {
          label: 'Booking',
          code: 'HOP_Book',
          route: this.navigationLink.getLink('bookingLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-cog',
          description: 'Manage hotel room types, availability, rates, and reservations.'
        },
        {
          label: 'E-Booking',
          code: 'HOP_RM_CHK',
          route: this.navigationLink.getLink('eBookingLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'pi pi-credit-card',
          description: 'Handle billing and checkout process for room guests.'
        },
       
      ]
    },    
    {
      label: 'CRM',
      code: 'CRM',
      icon: 'fas fa-user-friends',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The CRM module of OptimaXSuites helps businesses manage customer interactions, relationships, and engagement strategies in one centralized place.',
      shortDescription: 'Track and manage customer interactions and relationships.',
      route: this.navigationLink.getLink('crmLink'),
      locked: true,
      active: false
    },    
    {
      label: 'Expense',
      code: 'optimaXExpense',
      icon: 'fas fa-money-bill-wave',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Expense module of OptimaXSuites enables businesses to track and manage all types of financial outflows including reimbursements, cash advances, and expense reporting.',
      shortDescription: 'Track and manage expenses, reimbursements, and advances.',
      route: this.navigationLink.getLink('expensesLink'),
      locked: true,
      active: true,
      submenu: [
        {
          label: 'Expenses',
          code: 'EXP_EXP',
          route: this.navigationLink.getLink('expensesLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-dollar',
          description: 'Log and manage day-to-day operational and business-related expenses.'
        },
        {
          label: 'Reimbursements',
          code: 'EXP_RMBRSE',
          route: this.navigationLink.getLink('reimbursementLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-credit-card',
          description: 'Submit and approve employee reimbursements for incurred costs.'
        },
        {
          label: 'Advance',
          code: 'EXP_ADV',
          route: this.navigationLink.getLink('advanceLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-credit-card',
          description: 'Manage advance payment requests and track their utilization.'
        },
        {
          label: 'Report',
          code: 'EXP_RPT',
          route: this.navigationLink.getLink('expenseReportLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-credit-card',
          description: 'Generate financial reports based on expense data and categories.'
        }
      ]
    },    
    {
      label: 'Vendor',
      code: 'VENDOR',
      route: this.navigationLink.getLink('vendorLink'),
      icon: 'fas fa-user-tie',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Vendor module of OptimaXSuites helps manage supplier records, performance, contracts, and compliance documentation.',
      shortDescription: 'Track and manage supplier details, contracts, and compliance.',
      locked: true,
      active: false
    },    
    {
      label: 'Tender',
      code: 'TENDER',
      route: this.navigationLink.getLink('tenderLink'),
      icon: 'fas fa-file-alt',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Tender module of OptimaXSuites allows organizations to manage procurement notices, bids, and evaluations in a centralized system.',
      shortDescription: 'Manage procurement notices, bids, and evaluation processes.',
      locked: true,
      active: false
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
      code: 'General Settings',
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
      code: 'Sales',

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
      code: 'Purchase',

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
      code: 'Inventory',
      roles: ['ROLE_USER' , 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('inventorySettings'),

      icon: 'pi pi-cog',
      submenu: [
        { label: 'User Management', route: this.navigationLink.getLink('inventoryLink'), roles: ['ROLE_USER'], icon: 'pi pi-users' },
      ],
    },
    {
      label: 'Procurement',
      code: 'optimaXProcurement',
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
      code: 'Accounting',
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
      code: 'HR',
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
      code: 'Hospitality',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users',
      route: this.navigationLink.getLink('HOSSettings'),

      submenu: [
   
      ],
 

    },
    {
      label: 'Point of Sale (POS)',
      code: 'optimaXPOS',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('posSettings'),

      icon: 'pi pi-shopping-bag', 
      submenu: [
        { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
       
      ],
    },
    {
      label: 'Office Productivity',
      code: 'Office Productivity',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('officeSet'),

      icon: 'pi pi-shopping-bag', 
      submenu: [
        { label: 'Sales', route: this.navigationLink.getLink('posLink'), roles: ['ROLE_USER'], icon: 'pi pi-cart' },
       
      ],
    },
    {
      label: 'User and Roles Management',
      code: 'User and Roles Management',
      route: this.navigationLink.getLink('userRoles'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-check', 
      submenu: [
        { label: 'Order Summary', route: this.navigationLink.getLink('userRoles'), roles: ['ROLE_USER'], icon: 'pi pi-file' },
 
      ],
    },
    {
      label: 'CRM',
      code: 'CRM',
      route: this.navigationLink.getLink('CRMSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-users', 
      submenu: [
        { label: 'Contacts', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER'], icon: 'pi pi-user' },
       
      ],
    },
    {
      label: 'Expense',
      code: 'optimaXExpense',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('expenseSettings'),

      icon: 'pi pi-money-bill', 
      submenu: [
        { label: 'Expenses', route: this.navigationLink.getLink('expensesLink'), roles: ['ROLE_USER'], icon: 'pi pi-dollar' },
 

      ],
    },
    {
      label: 'Tender',
      code: 'Tender',
      route: this.navigationLink.getLink('tenderSettings'),

      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'pi pi-user' 
    },
    {
      label: 'Vendor',
      code: 'Vendor',
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
      code: 'User Management',
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
    const token = sessionStorage.getItem('Token');
    if (token) {
     this.getRegisterApps()
    } else {
      console.log('No token yet — skipping app registration fetch');
    }
  
   
  }
  
  async getRegisterApps(){
    this.appRegisterService.getRegisteredApp().subscribe({
      next: (app: any) => {
        this.appList = app;
         this.loadUnlockedModules(); 
         this.loadUnlockedSettingsModules();
      },
      error: (error: any) => {
        console.error('Error fetching app data:', error);
      }
    });
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
    const unlockedRoutes = this.appList.map((app : {name : string}) => app.name)
    // const unlockedRoutes = JSON.parse(localStorage.getItem('unlockedModules') || '[]');
    console.log(unlockedRoutes)
    
    let unlockedCount = 0;
  
    this.menuItems.forEach(module => {
      if (unlockedRoutes.includes(module.code || 'null')) {
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
    const unlockedRoutes = this.appList.map((app : {name : string}) => app.name)
    console.log(unlockedRoutes)
  
    this.settingsMenuItems.forEach((module) => {
      if (module.code === 'General Settings' || module.code === 'User and Roles Management') {
        module.locked = false; 
      } else {
        module.locked = !unlockedRoutes.includes(module.code || 'null');
      }
    });

    console.log('Updated Settings Menu:', this.settingsMenuItems);
    this.settingsMenuItemsSubject.next([...this.settingsMenuItems]); 

  }
  
  getUnlockedModules(): MenuItem[] {
    let unlockedModules = this.menuItems.filter(module => !module.locked || module.label === 'Dashboard');

    const hasUnlocked = unlockedModules.some(module => module.label !== 'Dashboard');
    if (hasUnlocked) {
      unlockedModules = unlockedModules.map(module =>
        module.label === 'Settings' ? { ...module, locked: false } : module
      );
    }
  
    return [...unlockedModules];
   
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

  getMenuItems$(): Observable<MenuItem[]> {
  if (this.isSuperUser()) {
    return this.getUnlockedModulesObservable();
  }

  return this.getUnlockedModulesObservable().pipe(
    map(modules => {
      const allowedCodes = this.getUserPermissions();

      const filterSubmenu = (submenu: any[]) => {
        return submenu.filter(item => item.doNotRegisterAsPermission || allowedCodes.includes(item.code));
      };

      return modules
        .map(menu => {
          if (menu.code === 'dashboard') {
            return menu;
          }

        

          if (menu.submenu) {
            const filteredSubmenu = filterSubmenu(menu.submenu);
            if (filteredSubmenu.length > 0) {
              return { ...menu, submenu: filteredSubmenu, locked: false };
            } else {
              return null;
            }
          }

          return menu.doNotRegisterAsPermission || allowedCodes.includes(menu.code ?? "") ? menu : null;
        })
        .filter(Boolean) as MenuItem[];
    })
  );
}



  getUserPermissions(): string[] {
  const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
  if (!user?.appRole?.appRolePermissionList) return [];

  console.log(user.appRole.appRolePermissionList
    .filter((perm: any) => perm.canView || perm.superuser)
    .map((perm: any) => perm.appRegister.appCode))

  return user.appRole.appRolePermissionList
    .filter((perm: any) => perm.canView || perm.superuser)
    .map((perm: any) => perm.appRegister.appCode);  
}

isSuperUser(): boolean {
  const roles = sessionStorage.getItem("role");
  return roles?.includes("ROLE_ADMIN") ?? false;
}

}
