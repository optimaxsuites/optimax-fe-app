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
        // ── Work ──────────────────────────────────────────────────────────────
        { label: 'Work', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Tasks and Routines',
          code: 'DASH_FEED',
          route: this.navigationLink.getLink('feedLink'),
          roles: ['ROLE_USER'],
          icon: 'pi pi-calendar-plus',
          description: 'Plan daily tasks, routines, and personal work targets.'
        },

        // ── Communication ─────────────────────────────────────────────────────
        { label: 'Communication', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Communications',
          code: 'DASH_COMM',
          route: this.navigationLink.getLink('communicationsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-envelope',
          description: 'View and manage communications across the organization.'
        },
        {
          label: 'Meetings & Appointments',
          code: 'DASH_MEETINGS_APPOINTMENTS',
          route: this.navigationLink.getLink('meetingsAppointmentsLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-calendar-check',
          description: 'Schedule meetings, appointments, rooms, minutes, attendance, and follow-up actions.'
        },

        // ── Intelligence ──────────────────────────────────────────────────────
        { label: 'Intelligence', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'OptimaXAI',
          code: 'OPTIMA_AI',
          route: this.navigationLink.getLink('optimaXAILink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-robot',
          description: 'optimax business artificial intelligence.'
        },
        {
          label: 'Analytics',
          code: 'DASH_ANALY',
          route: this.navigationLink.getLink('analyticsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-chart-pie',
          description: 'BUSINESS ANALYTICS.'
        }
      ]
    },
    {
      label: 'Commerce',
      code: 'optimaXCommerce',
      route: this.navigationLink.getLink('salesLink'),
      icon: 'fas fa-chart-line',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Sales module of OptimaXSuites enables businesses to manage and track customer sales activities, revenue generation, and sales performance analytics.',
      shortDescription: 'Track customer sales, revenue, and performance metrics.',
      locked: true,
      active: false,
      submenu: [
        // ── Transactions ──────────────────────────────────────────────────────
        { label: 'Transactions', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Sales',
          code: 'COM_SALES',
          route: this.navigationLink.getLink('SHLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-receipt',
          description: 'Make procurement requests on behalf of the organization.'
        },
        {
          label: 'Procurement',
          code: 'COM_PROCURE',
          route: this.navigationLink.getLink('PMLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-shopping-cart',
          description: 'View and manage vendor purchase requests.'
        },
        {
          label: 'Vendor Management',
          code: 'COM_VENDOR_MGMT',
          route: this.navigationLink.getLink('VMLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-shopping-cart',
          description: 'View and manage vendor onboarding and lifecycle.'
        },

        // ── Partners ──────────────────────────────────────────────────────────
        { label: 'Partners', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Vendor Portal',
          code: 'COM_VENDOR',
          route: this.navigationLink.getLink('VPLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-handshake',
          description: 'View and manage vendor quotations.'
        },

        // ── Insights ──────────────────────────────────────────────────────────
        { label: 'Insights', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Reports & Analytics',
          code: 'REPORT_ANALYSIS',
          route: this.navigationLink.getLink('RALink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-chart-bar',
          description: 'View and manage reports and analytics.'
        }
      ]
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
      label: 'Finance',
      code: 'optimaXAccounting',
      icon: 'fas fa-landmark',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Finance module of OptimaXSuites provides tools for managing financial transactions, ledgers, reconciliations, and generating financial reports.',
      shortDescription: 'Manage financial records, ledgers, and financial reports.',
      locked: true,
      active: true,
      submenu: [
        // ── Overview ──────────────────────────────────────────────────────────
        { label: 'Overview', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Dashboard',
          code: 'ACCT_DASH',
          route: this.navigationLink.getLink('financeDashboardLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-tachometer-alt',
          description: 'Overview of financial health: revenue, expenses, profit, and pending events.'
        },

        // ── Core Accounting ────────────────────────────────────────────────────
        { label: 'Core Accounting', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Accounting Events',
          code: 'ACCT_EVENTS',
          route: this.navigationLink.getLink('financeEventsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-inbox',
          description: 'Review, approve and post financial events from all modules.'
        },
        {
          label: 'Journal Entries',
          code: 'ACCT_JE',
          route: this.navigationLink.getLink('financeJournalsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-book-open',
          description: 'Audit-ready double-entry bookkeeping and manual journal entries.'
        },
        {
          label: 'General Ledger',
          code: 'ACCT_GL',
          route: this.navigationLink.getLink('financeLedgerLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-book',
          description: 'Complete double-entry transaction history and trial balance.'
        },
        {
          label: 'Chart of Accounts',
          code: 'ACCT_COA',
          route: this.navigationLink.getLink('financeCoaLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-sitemap',
          description: 'Hierarchical IFRS-compliant account structure.'
        },

        // ── Receivables & Payables ────────────────────────────────────────────
        { label: 'Receivables & Payables', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Accounts Receivable',
          code: 'ACCT_AR',
          route: this.navigationLink.getLink('financeArLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-hand-holding-usd',
          description: 'Outstanding customer invoices and aging analysis.'
        },
        {
          label: 'Accounts Payable',
          code: 'ACCT_AP',
          route: this.navigationLink.getLink('financeApLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-file-invoice-dollar',
          description: 'Vendor bills and payment scheduling.'
        },
        {
          label: 'Bank & Reconciliation',
          code: 'ACCT_BANK',
          route: this.navigationLink.getLink('financeBankingLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-university',
          description: 'Connected bank accounts, statements, and GL reconciliation.'
        },
        {
          label: 'Payment Runs',
          code: 'ACCT_PAY',
          route: this.navigationLink.getLink('financePaymentsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-money-bill-wave',
          description: 'Initiate, review, authorise and disburse payments with CBN dual-auth.'
        },

        // ── Reporting ─────────────────────────────────────────────────────────
        { label: 'Reporting', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Financial Reports',
          code: 'ACCT_REPTS',
          route: this.navigationLink.getLink('financeReportsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-chart-bar',
          description: 'IFRS-compliant financial statements — Income Statement, Balance Sheet, Cash Flow, Trial Balance, and 10 more.'
        },
        {
          label: 'Tax',
          code: 'ACCT_TAX',
          route: this.navigationLink.getLink('financeTaxLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-calculator',
          description: 'VAT, WHT, CIT — FIRS compliance tax codes and rates.'
        },
        {
          label: 'Budgets & Forecasting',
          code: 'ACCT_BUDGETS',
          route: this.navigationLink.getLink('financeBudgetsLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-bullseye',
          description: 'FY 2026 budget tracking vs actuals by department.'
        },

        // ── Configuration ─────────────────────────────────────────────────────
        { label: 'Configuration', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Period Close',
          code: 'ACCT_PERIOD_CLOSE',
          route: this.navigationLink.getLink('financePeriodCloseNavLink'),
          roles: ['ROLE_ADMIN'],
          icon: 'fas fa-lock',
          description: 'Month-end and year-end close wizard with pre-close checks, soft lock, and hard lock.'
        },
        {
          label: 'Accounting Settings',
          code: 'ACCT_SETTINGS',
          route: this.navigationLink.getLink('financeSettingsNavLink'),
          roles: ['ROLE_ADMIN'],
          icon: 'fas fa-cogs',
          description: 'Fiscal year, base currency, VAT registration, event definitions, approval thresholds.'
        },

        // ── Governance ────────────────────────────────────────────────────────
        { label: 'Governance', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Audit Trail',
          code: 'ACCT_AUDIT',
          route: this.navigationLink.getLink('financeAuditlogLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-search',
          description: 'Immutable log of every create, modify, approve, post, reverse, and lock action.'
        },
        {
          label: 'Assessment Report',
          code: 'ACCT_ASSESSMENT',
          route: this.navigationLink.getLink('financeAssessmentLink'),
          roles: ['ROLE_ADMIN'],
          icon: 'fas fa-clipboard-list',
          description: 'Comprehensive audit of the Accounting module against global ERP standards.'
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
        // ── Overview ──────────────────────────────────────────────────────────
        { label: 'Overview', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'My Dashboard',
          code: 'HR_EMP_ME',
          route: this.navigationLink.getLink('employeeDashboardLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-user-circle',
          doNotRegisterAsPermission: true
        },

        // ── People Management ─────────────────────────────────────────────────
        { label: 'People Management', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
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
        {
          label: 'Org Chart',
          code: 'HR_ORG_CHART',
          route: this.navigationLink.getLink('hrOrgChart'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-sitemap',
          description: 'Visual organisational chart — departments, reporting lines, and headcount.'
        },

        // ── Time & Attendance ─────────────────────────────────────────────────
        { label: 'Time & Attendance', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
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
        },
        {
          label: 'Work Schedule',
          code: 'HR_WORK_SCH',
          route: this.navigationLink.getLink('workScheduleLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-clock',
          description: 'Set and manage employee shift schedules and working hours.'
        },
        {
          label: 'Overtime',
          code: 'HR_OVERTIME',
          route: this.navigationLink.getLink('hrOvertime'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-hourglass-half',
          description: 'Configure overtime rules and manage overtime type catalog.'
        },

        // ── Compensation ──────────────────────────────────────────────────────
        { label: 'Compensation', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Payroll',
          code: 'HR_PAYROLL',
          route: this.navigationLink.getLink('payroll'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-dollar-sign',
          description: 'Process employee salaries, bonuses, deductions, and payslips.'
        },
        {
          label: 'Payroll Operations',
          code: 'HR_QUERY',
          route: this.navigationLink.getLink('queryLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-sliders-h',
          description: 'Manage queries and support tickets raised by employees.'
        },
        {
          label: 'Contribution & Loans',
          code: 'HR_ADVANCE',
          route: this.navigationLink.getLink('advance'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-hand-holding-usd',
          description: 'Process employee advances and manage advance requests.'
        },

        // ── Performance & Projects ────────────────────────────────────────────
        { label: 'Performance & Projects', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Performance',
          code: 'HR_PERF',
          route: this.navigationLink.getLink('performanceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-star',
          description: 'Monitor employee performance, set goals, and conduct evaluations.'
        },
        {
          label: 'Project',
          code: 'HR_PROJECT',
          route: this.navigationLink.getLink('projectLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-project-diagram'
        },
        {
          label: 'Work Productivity',
          code: 'HR_PRODUCTIVITY',
          route: this.navigationLink.getLink('productivityLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-chart-line',
          description: 'Track execution, reviews, and operational productivity in one workspace.'
        },

        // ── Reporting & Analytics ─────────────────────────────────────────────
        { label: 'Reporting & Analytics', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Analytics',
          code: 'HR_ANALYTICS',
          route: this.navigationLink.getLink('hrAnalytics'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-chart-bar',
          description: 'Executive HR analytics — workforce, payroll, leave, turnover, and risk.'
        },
        {
          label: 'Reports',
          code: 'HR_REPORTS',
          route: this.navigationLink.getLink('hrReports'),
          roles: ['ROLE_ADMIN'],
          icon: 'fas fa-chart-bar',
          description: 'Overtime cost analysis and probation tracking reports.'
        },

      ]
    },
    {
      label: 'Work Productivity',
      code: 'HR_PRODUCTIVITY',
      route: this.navigationLink.getLink('productivityLink'),
      icon: 'fas fa-file-alt',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      description: 'The Work Productivity module of OptimaXSuites provides tools for task execution, performance tracking, reviews, and productivity monitoring.',
      shortDescription: 'Track execution, reviews, and operational productivity in one workspace.',
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
        // ── Catalogue ─────────────────────────────────────────────────────────
        { label: 'Catalogue', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
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

        // ── Selling ───────────────────────────────────────────────────────────
        { label: 'Selling', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Sales',
          code: 'POS_SALES',
          route: this.navigationLink.getLink('salesLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-cash-register',
          description: 'View and manage sales records, transactions, and revenue data.'
        },
        {
          label: 'Optimerce Sales',
          code: 'POS_ESALES',
          route: this.navigationLink.getLink('esalesLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-store',
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
          label: 'Refunds',
          code: 'POS_RFND',
          route: this.navigationLink.getLink('refundLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-undo',
          description: 'Handle refund transactions and maintain refund history.'
        },

        // ── Kitchen ───────────────────────────────────────────────────────────
        { label: 'Kitchen', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Kitchen',
          code: 'POS_KITCHEN',
          route: this.navigationLink.getLink('kitchenLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-utensils',
          description: 'Manage kitchen display and order flow.',
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

        // ── E-Commerce ────────────────────────────────────────────────────────
        { label: 'E-Commerce', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Optimerce',
          code: 'POS_STORE',
          route: this.navigationLink.getLink('storeLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-globe',
          description: 'Manage your online storefront and e-commerce operations.'
        },

        // ── Insights ──────────────────────────────────────────────────────────
        { label: 'Insights', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Report',
          code: 'POS_REPRT',
          route: this.navigationLink.getLink('reportLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-chart-pie',
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
        // ── Rooms ─────────────────────────────────────────────────────────────
        { label: 'Rooms', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Room',
          code: 'HOP_ROOM',
          route: this.navigationLink.getLink('roomLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-bed',
          description: 'Manage hotel room types, availability, rates, and reservations.'
        },
        {
          label: 'Booking',
          code: 'HOP_Book',
          route: this.navigationLink.getLink('bookingLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-calendar-plus',
          description: 'Manage hotel room types, availability, rates, and reservations.'
        },
        {
          label: 'E-Booking',
          code: 'HOP_RM_CHK',
          route: this.navigationLink.getLink('eBookingLink'),
          roles: ['ROLE_USER', 'ROLE_ADMIN'],
          icon: 'fas fa-laptop',
          description: 'Handle billing and checkout process for room guests.'
        },
        {
          label: 'House Keeping',
          code: 'HOP_HOUSE',
          route: this.navigationLink.getLink('HKLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-broom',
          description: 'Manage housekeeping schedules and room readiness.'
        },

        // ── Operations ────────────────────────────────────────────────────────
        { label: 'Operations', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Services',
          code: 'HOP_SERV',
          route: this.navigationLink.getLink('serviceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-concierge-bell',
          description: 'Manage add-on services such as laundry, room service, or extra amenities.'
        },
        {
          label: 'Guests',
          code: 'HOP_GUEST',
          route: this.navigationLink.getLink('guestLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-user-friends',
          description: 'Manage guest profiles, preferences, and history.'
        },
        {
          label: 'Payment',
          code: 'HOP_PAY',
          route: this.navigationLink.getLink('payLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-credit-card',
          description: 'Process guest payments and manage billing.'
        }
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
      active: false,
      submenu: [
        // ── Overview ──────────────────────────────────────────────────────────
        { label: 'Overview', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Dashboard', code: 'CRM_DASHBOARD', route: this.navigationLink.getLink('crmLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-tachometer-alt', description: 'CRM overview dashboard.' },

        // ── Customers ─────────────────────────────────────────────────────────
        { label: 'Customers', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Contacts', code: 'CRM_CONTACTS', route: this.navigationLink.getLink('crmContactsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-address-book', description: 'Manage CRM contacts.' },
        { label: 'Accounts', code: 'CRM_ACCOUNTS', route: this.navigationLink.getLink('crmAccountsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-building', description: 'Manage CRM accounts.' },

        // ── Sales ─────────────────────────────────────────────────────────────
        { label: 'Sales', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Pipeline', code: 'CRM_PIPELINE', route: this.navigationLink.getLink('crmPipelineLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-stream', description: 'Manage sales pipeline.' },
        { label: 'Leads', code: 'CRM_LEADS', route: this.navigationLink.getLink('crmLeadsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-crosshairs', description: 'Manage leads.' },
        { label: 'Quotes & CPQ', code: 'CRM_QUOTES', route: this.navigationLink.getLink('crmQuotesLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-invoice', description: 'Manage quotes and CPQ.' },

        // ── Marketing ─────────────────────────────────────────────────────────
        { label: 'Marketing', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Campaigns', code: 'CRM_CAMPAIGNS', route: this.navigationLink.getLink('crmCampaignsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-bullhorn', description: 'Manage marketing campaigns.' },
        { label: 'Activities', code: 'CRM_ACTIVITIES', route: this.navigationLink.getLink('crmActivitiesLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-calendar-alt', description: 'Manage CRM activities.' },

        // ── Service ───────────────────────────────────────────────────────────
        { label: 'Service', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Contracts', code: 'CRM_CONTRACTS', route: this.navigationLink.getLink('crmContractsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-contract', description: 'Manage CRM contracts.' },
        { label: 'Support', code: 'CRM_SUPPORT', route: this.navigationLink.getLink('crmTicketsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-headset', description: 'Manage support tickets.' },

        // ── Insights ──────────────────────────────────────────────────────────
        { label: 'Insights', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Reports', code: 'CRM_REPORTS', route: this.navigationLink.getLink('crmReportsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-chart-bar', description: 'Pre-built and custom CRM reports.' },

        // ── Configuration ─────────────────────────────────────────────────────
        { label: 'Configuration', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        { label: 'Automation', code: 'CRM_AUTOMATION', route: this.navigationLink.getLink('crmAutomationLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-bolt', description: 'Workflows and automation rules.' },
        { label: 'Government', code: 'CRM_GOVERNMENT', route: this.navigationLink.getLink('crmGovernmentLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-landmark', description: 'Government and public sector CRM.' },
        { label: 'Commissions', code: 'CRM_COMMISSION', route: this.navigationLink.getLink('crmCommissionLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-money-bill-wave', description: 'Commission schemes, sales targets, actuals, and approval.', doNotRegisterAsPermission: true },
        { label: 'CRM Settings', code: 'CRM_SETTINGS', route: this.navigationLink.getLink('crmSettingsLink'), roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-cog', description: 'CRM configuration settings.' },
      ],
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
        // ── Expenses ──────────────────────────────────────────────────────────
        { label: 'Expenses', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Expenses',
          code: 'EXP_EXP',
          route: this.navigationLink.getLink('expensesLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-money-bill-wave',
          description: 'Log and manage day-to-day operational and business-related expenses.'
        },
        {
          label: 'Reimbursements',
          code: 'EXP_RMBRSE',
          route: this.navigationLink.getLink('reimbursementLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-hand-holding-usd',
          description: 'Submit and approve employee reimbursements for incurred costs.'
        },
        {
          label: 'Advance',
          code: 'EXP_ADV',
          route: this.navigationLink.getLink('advanceLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-coins',
          description: 'Manage advance payment requests and track their utilization.'
        },

        // ── Insights ──────────────────────────────────────────────────────────
        { label: 'Insights', roles: [], isSectionHeader: true, doNotRegisterAsPermission: true },
        {
          label: 'Report',
          code: 'EXP_RPT',
          route: this.navigationLink.getLink('expenseReportLink'),
          roles: ['ROLE_USER'],
          icon: 'fas fa-chart-bar',
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
      locked: true,
      doNotRegisterAsPermission: true
    },
  ];

  private settingsMenuItems: MenuItem[] = [
    {
      label: 'General Settings',
      code: 'General Settings',
      route: this.navigationLink.getLink('generalSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-cog',
      description: 'Configure business profile, branches, security and email setup.',
      submenu: [
        { label: 'Profile', route: this.navigationLink.getLink('generalSettings'), queryParams: { panel: 'profile' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-user-circle' },
        { label: 'Branches & Location', route: this.navigationLink.getLink('generalSettings'), queryParams: { panel: 'branches' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-map-marker-alt' },
        { label: 'Security / Privacy', route: this.navigationLink.getLink('generalSettings'), queryParams: { panel: 'security' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-lock' },
        { label: 'Email Account Setup', route: this.navigationLink.getLink('generalSettings'), queryParams: { panel: 'email' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-envelope' },
      ],
    },
    {
      label: 'Sales',
      code: 'Sales',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('salesSettings'),
      icon: 'fas fa-chart-line',
      description: 'Configure sales channels, pricing rules and order preferences.',
      submenu: [],
    },
    {
      label: 'Purchase',
      code: 'Purchase',
      route: this.navigationLink.getLink('purchaseSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-shopping-bag',
      description: 'Set up purchase order workflows and supplier defaults.',
      submenu: [],
    },
    {
      label: 'Inventory',
      code: 'Inventory',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('inventorySettings'),
      icon: 'fas fa-boxes',
      description: 'Manage stock tracking, warehouses and reorder thresholds.',
      submenu: [],
    },
    {
      label: 'Procurement',
      code: 'optimaXProcurement',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('vendorSettings'),
      icon: 'fas fa-truck',
      description: 'Configure RFQ templates, vendor defaults and approval chains.',
      submenu: [],
    },
    {
      label: 'Finance',
      code: 'optimaXAccounting',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('financeSettingsLink'),
      icon: 'fas fa-landmark',
      description: 'Set fiscal year, chart of accounts, event definitions and reconciliation rules.',
      submenu: [
        { label: 'Accounting Settings', route: this.navigationLink.getLink('financeSettingsLink'), roles: ['ROLE_ADMIN'], icon: 'fas fa-cogs' },
        { label: 'Period Close & Lock', route: this.navigationLink.getLink('financePeriodCloseLink'), roles: ['ROLE_ADMIN'], icon: 'fas fa-lock' },
      ],
    },
    {
      label: 'Human Resources',
      code: 'HR',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('HRSettings'),
      icon: 'fas fa-users',
      description: 'Manage salary, payroll, leave, appraisals and HR metadata.',
      submenu: [
        { label: 'Salary', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'salary' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-money-bill-wave' },
        { label: 'Payroll', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'payroll' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-invoice-dollar' },
        { label: 'Compensations & Deductions', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'compensation' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-balance-scale' },
        { label: 'Metadata', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'metadata' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-tags' },
        { label: 'Level', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'level' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-layer-group' },
        { label: 'Leave', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'leave' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-calendar-minus' },
        { label: 'Email Templates', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'email-templates' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-envelope-open-text' },
        { label: 'Score Sheet', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'scoresheet' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-clipboard-list' },
        { label: 'Appraisal Assessment', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'appraisal' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-tasks' },
        { label: 'Notifications', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'notifications' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-bell' },
        { label: 'Import from Odoo', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'odoo' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-puzzle-piece' },
        { label: 'Forms & Templates', route: this.navigationLink.getLink('HRSettings'), queryParams: { panel: 'forms' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-file-alt' },
      ],
    },
    {
      label: 'Hospitality',
      code: 'Hospitality',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-hotel',
      route: this.navigationLink.getLink('HOSSettings'),
      description: 'Configure room types, booking rules and hospitality services.',
      submenu: [],
    },
    {
      label: 'Point of Sale (POS)',
      code: 'optimaXPOS',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('posSettings'),
      icon: 'fas fa-cash-register',
      description: 'Set up e-store, payment gateways and product metadata.',
      submenu: [
        { label: 'E-store Settings', route: this.navigationLink.getLink('posSettings'), queryParams: { panel: 'estore' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-store' },
        { label: 'Product Metadata', route: this.navigationLink.getLink('posSettings'), queryParams: { panel: 'metadata' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-boxes' },
      ],
    },
    {
      label: 'Office Productivity',
      code: 'Office Productivity',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('officeSet'),
      icon: 'fas fa-briefcase',
      description: 'Configure workspace, collaboration and productivity tools.',
      submenu: [],
    },
    {
      label: 'User and Roles Management',
      code: 'User and Roles Management',
      route: this.navigationLink.getLink('userRoles'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-user-shield',
      description: 'Manage users, roles, permissions and approval workflows.',
      submenu: [
        { label: 'User Management', route: this.navigationLink.getLink('userRoles'), queryParams: { panel: 'users' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-users' },
        { label: 'Roles Management', route: this.navigationLink.getLink('userRoles'), queryParams: { panel: 'roles' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-user-tag' },
        { label: 'Approval Workflows', route: this.navigationLink.getLink('userRoles'), queryParams: { panel: 'approvals' }, roles: ['ROLE_USER', 'ROLE_ADMIN'], icon: 'fas fa-project-diagram' },
      ],
    },
    {
      label: 'CRM',
      code: 'CRM',
      route: this.navigationLink.getLink('CRMSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-handshake',
      description: 'Configure customer pipeline, contact fields and CRM workflows.',
      submenu: [],
    },
    {
      label: 'Expense',
      code: 'optimaXExpense',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      route: this.navigationLink.getLink('expenseSettings'),
      icon: 'fas fa-money-bill-wave',
      description: 'Set expense categories, approval limits and reimbursement rules.',
      submenu: [],
    },
    {
      label: 'Tender',
      code: 'Tender',
      route: this.navigationLink.getLink('tenderSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-file-contract',
      description: 'Configure tender templates, evaluation criteria and bid rules.',
      submenu: [],
    },
    {
      label: 'Vendor',
      code: 'Vendor',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-user-tie',
      route: this.navigationLink.getLink('vendorSettings'),
      description: 'Manage vendor onboarding, compliance and contract settings.',
      submenu: [],
    },
    {
      label: 'User Management',
      code: 'User Management',
      route: this.navigationLink.getLink('userManagmentSettings'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-users-cog',
      description: 'System-level user administration and access controls.',
      submenu: [],
    },
    {
      label: 'Module Registry',
      code: 'MODULE_REGISTRY',
      route: this.navigationLink.getLink('moduleRegistry'),
      roles: ['ROLE_ADMIN'],
      icon: 'fas fa-cubes',
      description: 'Create and manage AppModules and AppRegister entries to wire frontend components into role permissions.',
      submenu: [],
    },
    {
      label: 'Bug Tracker',
      code: 'BUG_TRACKER',
      route: this.navigationLink.getLink('bugTracker'),
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      icon: 'fas fa-bug',
      description: 'Track, manage and resolve bugs and issues across all OptimaX modules.',
      submenu: [],
    },
  ];

  appList = []
  private unlockedModules$ = new BehaviorSubject<MenuItem[]>([]);
  private modulesRolePermissions = [
    {
      name: 'POS',
      forms: ['product', 'report', 'sales', 'inventory', 'checkout']
    },
    {
      name: 'Human Resources',
      forms: ['employee', 'recruitment', 'Job vacancy', 'leave', 'loan', 'attendance', 'payroll']
    },
    {
      name: 'Work Productivity',
      forms: ['Work Productivity']
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
    }


  }

  private getRegisteredItemCode(app: any): string {
    return String(app?.uid || app?.appCode || app?.code || app?.name || '').trim();
  }

  private getRegisteredItemLabel(app: any): string {
    return String(app?.appName || app?.label || app?.title || app?.name || '').trim();
  }

  async getRegisterApps() {
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
      if (module.label === "POS") {
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
    const unlockedRoutes = this.appList.map((app: any) => this.getRegisteredItemCode(app)).filter(Boolean)
    const unlockedLabels = this.appList.map((app: any) => this.getRegisteredItemLabel(app)).filter(Boolean)

    let unlockedCount = 0;

    this.menuItems.forEach(module => {
      if (unlockedRoutes.includes(module.code || 'null') || unlockedLabels.includes(module.label)) {
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
    const unlockedRoutes = this.appList.map((app: any) => this.getRegisteredItemCode(app)).filter(Boolean)
    const unlockedLabels = this.appList.map((app: any) => this.getRegisteredItemLabel(app)).filter(Boolean)

    const alwaysUnlocked = ['General Settings', 'User and Roles Management', 'MODULE_REGISTRY', 'BUG_TRACKER'];
    this.settingsMenuItems.forEach((module) => {
      if (alwaysUnlocked.includes(module.code || '')) {
        module.locked = false;
      } else {
        module.locked = !(unlockedRoutes.includes(module.code || 'null') || unlockedLabels.includes(module.label));
      }
    });
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

  getUnlockedModulesRole() {
    let unlockedModules = this.settingsMenuItems.filter(module => !module.locked);
    return this.modulesRolePermissions.filter(module => unlockedModules.some(m => m.label === module.name))
  }

  getUnlockedSettingsModules(): MenuItem[] {
    const isAdmin = this.isSuperUser();
    const alwaysShowAll = ['General Settings', 'Bug Tracker'];
    const adminOnly = ['User and Roles Management', 'Module Registry'];
    return this.settingsMenuItems.filter(module => {
      if (adminOnly.includes(module.label)) return isAdmin;
      if (alwaysShowAll.includes(module.label)) return true;
      return !module.locked;
    });
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
        const allowed = this.getUserPermissions();

        const filterSubmenu = (submenu: any[]) => {
          return submenu.filter(item =>
            item.doNotRegisterAsPermission ||
            allowed.codes.includes(item.code) ||
            allowed.labels.some(l => l.toLowerCase() === item.label?.toLowerCase())
          );
        };

        const filteredMenus = modules
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

            return menu.doNotRegisterAsPermission || allowed.codes.includes(menu.code ?? "") ? menu : null;
          })
          .filter(Boolean) as MenuItem[];

        return filteredMenus;
      })
    );
  }

  getUserPermissions(): { codes: string[], labels: string[] } {
    const user = JSON.parse(sessionStorage.getItem('userApplicationRole') || '{}');
    if (!user?.appRole?.appRolePermissionList) return { codes: [], labels: [] };

    const perms = user.appRole.appRolePermissionList
      .filter((perm: any) => perm.canView || perm.superuser);

    return {
      codes: perms.map((p: any) => p.appRegister?.appCode).filter(Boolean),
      labels: perms.map((p: any) => p.appRegister?.appName).filter(Boolean),
    };
  }

  isSuperUser(): boolean {
    const roles = sessionStorage.getItem("role");
    return roles?.includes("ROLE_ADMIN") ?? false;
  }

}
