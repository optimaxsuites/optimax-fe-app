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
    this.links['dashboardLink'] = '/admin/dashboard/communications/' + uuidV4();
    this.links['communicationsLink'] = '/admin/dashboard/communications/' + uuidV4();
    this.links['meetingsAppointmentsLink'] = '/admin/dashboard/meetings-appointments/' + uuidV4();
    this.links['optimaXAILink'] = '/admin/dashboard/optimaxai/' + uuidV4();
    this.links['analyticsLink'] = '/admin/dashboard/analytics/' + uuidV4();
    this.links['feedLink'] = '/admin/dashboard/tasks-routines/' + uuidV4();


    this.links['userRegistrationLink'] = '/admin/settings/user-reg/' + uuidV4();
    this.links['purchaseLink'] = '/admin/purchase/' + uuidV4();
    this.links['inventoryLink'] = '/admin/inventory/' + uuidV4();

    // this.links['procurementLink'] = '/admin/procurement/' +uuidV4();
    this.links['procurementSettingsLink'] = '/admin/procurement/settings/' + uuidV4();
    // this.links['rfqLink'] = '/admin/procurement/rfq/' +uuidV4();
    // this.links['rfqFormLink'] = '/admin/procurement/rfq-form/' +uuidV4();




    //sales links ================================================================================================================
    // this.links['aiQuotationLink'] = '/admin/commerce/ai-quotation/' +uuidV4();
    // this.links['deliveryManagementLink'] = '/admin/commerce/delivery-management/' +uuidV4();
    // this.links['docGenLink'] = '/admin/commerce/document-management/' +uuidV4();
    this.links['SHLink'] = '/admin/sales/sales-hub/' + uuidV4();
    this.links['PMLink'] = '/admin/sales/commerce/requests/home/' + uuidV4();
    this.links['VMLink'] = '/admin/sales/commerce/manage-vendors/' + uuidV4();
    this.links['INVLink'] = '/admin/sales/commerce/inventory/' + uuidV4();
    this.links['newRequestLink'] = '/admin/sales/commerce/requests/new/';
    this.links['draftsLink'] = '/admin/sales/commerce/requests/drafts/';
    // this.links['QTLink'] = '/admin/commerce/quote-management/' +uuidV4();
    this.links['VPLink'] = '/admin/sales/vendor-portal/' + uuidV4();
    this.links['RALink'] = '/admin/sales/reports/' + uuidV4();





    this.links['accountingLink'] = '/admin/accounting/transaction/' + uuidV4();
    this.links['accountSettings'] = '/admin/accounting/transaction/' + uuidV4();
    this.links['financeDashboardLink'] = '/admin/accounting/dashboard/' + uuidV4();
    this.links['financeEventsLink'] = '/admin/accounting/events/' + uuidV4();
    this.links['financeJournalsLink'] = '/admin/accounting/journals/' + uuidV4();
    this.links['financeLedgerLink'] = '/admin/accounting/ledger/' + uuidV4();
    this.links['financeCoaLink'] = '/admin/accounting/coa/' + uuidV4();
    this.links['financeArLink'] = '/admin/accounting/ar/' + uuidV4();
    this.links['financeApLink'] = '/admin/accounting/ap/' + uuidV4();
    this.links['financeBankingLink'] = '/admin/accounting/banking/' + uuidV4();
    this.links['financePaymentsLink'] = '/admin/accounting/payments/' + uuidV4();
    this.links['transactionLink'] = '/admin/accounting/transaction/' + uuidV4();
    this.links['accountingReportLink'] = '/admin/accounting/reports/' + uuidV4();
    this.links['reconciliationLink'] = '/admin/accounting/reconciliation/' + uuidV4();
    this.links['financeReportsLink'] = '/admin/accounting/finance-reports/' + uuidV4();
    this.links['financeTaxLink'] = '/admin/accounting/finance-tax/' + uuidV4();
    this.links['financeBudgetsLink'] = '/admin/accounting/finance-budgets/' + uuidV4();
    this.links['financeAuditlogLink'] = '/admin/accounting/finance-auditlog/' + uuidV4();
    this.links['financeSettingsLink'] = 'finance-settings/' + uuidV4();
    this.links['financePeriodCloseLink'] = 'finance-period-close/' + uuidV4();
    this.links['financeSettingsNavLink'] = '/admin/settings/finance-settings/' + uuidV4();
    this.links['financePeriodCloseNavLink'] = '/admin/settings/finance-period-close/' + uuidV4();
    this.links['financeAssessmentLink'] = '/admin/accounting/finance-assessment/' + uuidV4();



    // links =========================================================================================================================
    this.links['']

    // human resources ================================================================================================================
    this.links['hrLink'] = '/admin/hr/' + uuidV4();
    this.links['recuitmentLink'] = '/admin/hr/recruitment/' + uuidV4();
    this.links['leaveLink'] = '/admin/hr/leave/' + uuidV4();
    this.links['attendanceLink'] = '/admin/hr/attendance/' + uuidV4();
    this.links['interviewLink'] = '/admin/hr/interview/' + uuidV4();
    this.links['employeeManagementLink'] = '/admin/hr/employee-management/' + uuidV4();
    this.links['payroll'] = '/admin/hr/payroll-dashboard/' + uuidV4();
    this.links['projectLink'] = '/admin/hr/project/' + uuidV4();
    this.links['workScheduleLink'] = '/admin/hr/work-schedule/' + uuidV4();
    this.links['allPayslip'] = 'employee-payslip'
    this.links['performanceLink'] = '/admin/hr/performance/' + uuidV4();
    this.links['advance'] = '/admin/hr/loan/' + uuidV4();
    this.links['queryLink'] = '/admin/hr/payroll-operations/' + uuidV4();
    this.links['employeeDashboardLink'] = '/admin/hr/me/' + uuidV4();
    this.links['hrAnalytics'] = '/admin/hr/analytics/' + uuidV4();
    this.links['hrOvertime'] = '/admin/hr/overtime/' + uuidV4();
    this.links['hrOrgChart'] = '/admin/hr/org-chart/' + uuidV4();
    this.links['hrReports'] = '/admin/hr/reports/' + uuidV4();
    this.links['preOnboardingForm'] = '/admin/hr/pre-onboarding-form/' + uuidV4();
    this.links['employeeUpdateForm'] = '/admin/hr/employee-update-form/' + uuidV4();
    this.links['offboardingForm'] = '/admin/hr/offboarding-form/' + uuidV4();


    // hospitality ================================================================================================================
    this.links['roomLink'] = '/admin/hospitality/rooms/' + uuidV4();
    this.links['serviceLink'] = '/admin/hospitality/services/' + uuidV4();
    this.links['guestLink'] = '/admin/hospitality/guests/' + uuidV4();
    this.links['payLink'] = '/admin/hospitality/payments/' + uuidV4();
    this.links['HKLink'] = '/admin/hospitality/housekeeping/' + uuidV4();
    this.links['bookingLink'] = '/user/hospitality/bookings/' + uuidV4();
    this.links['roomsCheckoutLink'] = '/user/hospitality/checkout/' + uuidV4();
    this.links['eBookingLink'] = '/user/hospitality/e-bookings/home/' + uuidV4();




    //  resources ================================================================================================================
    this.links['posLink'] = '/admin/pos/' + uuidV4();
    this.links['crmLink'] = '/admin/crm/dashboard/' + uuidV4();
    this.links['crmContactsLink'] = '/admin/crm/contacts/' + uuidV4();
    this.links['crmAccountsLink'] = '/admin/crm/accounts/' + uuidV4();
    this.links['crmPipelineLink'] = '/admin/crm/pipeline/' + uuidV4();
    this.links['crmLeadsLink'] = '/admin/crm/leads/' + uuidV4();
    this.links['crmCampaignsLink'] = '/admin/crm/campaigns/' + uuidV4();
    this.links['crmActivitiesLink'] = '/admin/crm/activities/' + uuidV4();
    this.links['crmQuotesLink'] = '/admin/crm/quotes/' + uuidV4();
    this.links['crmContractsLink'] = '/admin/crm/contracts/' + uuidV4();
    this.links['crmTicketsLink'] = '/admin/crm/tickets/' + uuidV4();
    this.links['crmSettingsLink'] = '/admin/crm/settings/' + uuidV4();
    this.links['crmReportsLink'] = '/admin/crm/reports/' + uuidV4();
    this.links['crmAutomationLink'] = '/admin/crm/automation/' + uuidV4();
    this.links['crmGovernmentLink'] = '/admin/crm/government/' + uuidV4();
    this.links['crmCommissionLink'] = '/admin/crm/commission/' + uuidV4();
    this.links['expensesLink'] = '/admin/expenses/expense/' + uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' + uuidV4();
    this.links['productivityLink'] = '/admin/hr/productivity/' + uuidV4();


    // Vendor link========================================================================================================
    // this.links['vendorLink'] = '/vendor/' +uuidV4();
    // this.links['vendorRfqLink'] = '/vendor/rfq/' +uuidV4();



    // auth links ================================================================================================================
    this.links['signinLink'] = '/user/auth/' + uuidV4();
    this.links['vrsLink'] = '/user/auth/vrs/' + uuidV4();
    this.links['vrfLink'] = '/user/auth/vrf/' + uuidV4();
    this.links['signupLink'] = '/user/auth/sign-up/' + uuidV4();
    this.links['emvLink'] = '/user/auth/emv/' + uuidV4();
    this.links['verifyLink'] = '/user/auth/verify';
    //=============================================================================================================================
    this.links['checkoutLink'] = '/user/checkout/' + uuidV4();
    this.links['storeLink'] = '/optimerce/' + uuidV4();
    this.links['kitchenLink'] = '/user/checkout/kitchen/' + uuidV4();
    this.links['checkoutOrderLink'] = '/user/checkout/orders/' + uuidV4();
    this.links['cashPayment'] = '/user/checkout/cash-payment/' + uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' + uuidV4();
    this.links['orderRefund'] = '/user/checkout/refund/' + uuidV4();
    this.links['requestDetails'] = '/user/checkout/refund-request/' + uuidV4();
    this.links['openRegister'] = '/user/checkout/openRegister/' + uuidV4();
    this.links['closeRegister'] = '/user/checkout/closeRegister/' + uuidV4();

    // settings links ============================================================================================================
    this.links['settingsLink'] = '/admin/settings/settings-home/' + uuidV4();
    this.links['generalSettings'] = 'general-settings/' + uuidV4();
    this.links['HRSettings'] = 'HR-settings/' + uuidV4();
    this.links['posSettings'] = 'POS-settings/' + uuidV4();
    this.links['HOSSettings'] = 'Hospitality-settings/' + uuidV4();
    this.links['userRoles'] = 'user-roles/' + uuidV4();
    this.links['moduleRegistry'] = 'module-registry/' + uuidV4();
    this.links['bugTracker'] = 'bug-tracker/' + uuidV4();
    this.links['CRMSettings'] = 'crm-settings/' + uuidV4();

    // POS ================================================================================================================
    this.links['productLink'] = '/admin/pos/product/' + uuidV4();
    this.links['inventoryLink'] = `/admin/pos/inventory/${uuidV4()}`;
    this.links['salesLink'] = '/admin/pos/sale/' + uuidV4();
    this.links['esalesLink'] = '/admin/pos/e-store-sales/' + uuidV4();

    this.links['refundLink'] = '/admin/pos/refunds/' + uuidV4();
    this.links['reportLink'] = '/admin/pos/report/' + uuidV4();
    this.links['ingredientLink'] = '/admin/pos/ingredients/' + uuidV4();



    // Expenses ================================================================================================================
    this.links['reimbursementLink'] = '/admin/expenses/reimbursement/' + uuidV4()
    this.links['advanceLink'] = '/admin/expenses/advance/' + uuidV4()
    this.links['expenseReportLink'] = '/admin/expenses/report/' + uuidV4()


    // procurement ================================================================================================================
    this.links['procurementLink'] = '/admin/procurement/pr-management/' + uuidV4();
    this.links['vendorManagementLink'] = '/admin/procurement/vendor-management/' + uuidV4();
    this.links['vendorLink'] = '/admin/procurement/vendor-portal/dashboard/' + uuidV4();
    this.links['rfqLink'] = '/admin/procurement/vendor-portal/rfqs/' + uuidV4();
    this.links['quotationLink'] = '/admin/procurement/vendor-portal/quotations/' + uuidV4();
    this.links['lpoLink'] = '/admin/procurement/vendor-portal/lpo/' + uuidV4();
    this.links['VPLLink'] = '/admin/procurement/vendor-portal/vendor-pr-list/' + uuidV4();
    this.links['VQLLink'] = '/admin/procurement/vendor-portal/vendor-quote-list/' + uuidV4();

    // inventory ================================================================================================================
    this.links['inventorysLink'] = '/admin/inventory-management/' + uuidV4();


  }

  getLink(linkName: string): string {
    return this.links[linkName];
  }

  regenerateLinks(): void {
    this.generateLinks();
  }
}
