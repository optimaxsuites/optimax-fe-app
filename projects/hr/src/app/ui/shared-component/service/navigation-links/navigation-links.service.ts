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
    this.links['procurementSettingsLink'] = '/admin/procurement/settings/' +uuidV4();
    this.links['rfqLink'] = '/admin/procurement/rfq/' +uuidV4();
    this.links['rfqFormLink'] = '/admin/procurement/rfq-form/' +uuidV4();








    this.links['accountingLink'] = '/admin/accounting/' +uuidV4();

// links =========================================================================================================================
    this.links['']

// human resources ================================================================================================================
    this.links['hrLink'] = '/admin/hr/' +uuidV4();
    this.links['recuitmentLink'] = '/admin/hr/recruitment/' +uuidV4();
    this.links['leaveLink'] = '/admin/hr/leave/' +uuidV4();
    this.links['attendanceLink'] = '/admin/hr/attendance/' +uuidV4();
    this.links['attendanceReportsLink'] = '/admin/attendance-reports/' +uuidV4();
    this.links['interviewLink'] = '/admin/hr/interview/' +uuidV4();
    this.links['employeeManagementLink'] = '/admin/hr/employee-management/' +uuidV4();
    this.links['employeeDashboardLink'] = '/admin/hr/employee-dashboard/' +uuidV4();
    this.links['payroll'] = '/admin/hr/payroll-dashboard/' + uuidV4();
    this.links['allPayslip'] = 'employee-payslip'
    this.links['performanceLink'] = '/admin/hr/performance/' +uuidV4();
    this.links['workScheduleLink'] = '/admin/hr/work-schedule/' +uuidV4();



//  resources ================================================================================================================
    this.links['posLink'] = '/admin/pos/' +uuidV4();
    this.links['crmLink'] = '/admin/crm/' +uuidV4();
    this.links['expensesLink'] = '/admin/expenses/' + uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' + uuidV4();

// Vendor link========================================================================================================
    this.links['vendorLink'] = '/vendor/' +uuidV4();
    this.links['vendorRfqLink'] = '/vendor/rfq/' +uuidV4();



// auth links ================================================================================================================
    this.links['signinLink'] = '/user/auth/' +uuidV4();
    this.links['vrsLink'] = '/user/auth/vrs/' +uuidV4();
    this.links['vrfLink'] = '/user/auth/vrf/' +uuidV4();
    this.links['signupLink'] = '/user/auth/sign-up/' +uuidV4();
    this.links['emvLink'] = '/user/auth/emv/' +uuidV4();
    this.links['verifyLink'] = '/users/auth/verify';
//=============================================================================================================================
    this.links['checkoutLink'] = '/user/checkout/' +uuidV4();
    this.links['checkoutOrderLink'] = '/user/checkout/orders/' +uuidV4();
    this.links['cashPayment'] = '/user/checkout/cash-payment/' +uuidV4();
    this.links['orderDetails'] = '/user/checkout/order/' +uuidV4();
    this.links['orderRefund'] = '/user/checkout/refund/' +uuidV4();
    this.links['requestDetails'] = '/user/checkout/refund-request/' +uuidV4();
    this.links['openRegister'] = '/user/checkout/openRegister/' +uuidV4();
    this.links['closeRegister'] = '/user/checkout/closeRegister/' +uuidV4();

// settings links ============================================================================================================
this.links['settingsLink'] = '/admin/settings/general-settings/' +uuidV4();
this.links['generalSettings'] = 'general-settings/' +uuidV4();
this.links['HRSettings'] = '/admin/hr/HR-settings/' +uuidV4();
this.links['userProfile'] = '/admin/hr/user-profile/' +uuidV4();
    this.links['hrAnalytics'] = '/admin/hr/analytics/' +uuidV4();
    this.links['hrOvertime'] = '/admin/hr/overtime/' +uuidV4();
    this.links['hrOrgChart'] = '/admin/hr/org-chart/' +uuidV4();
    this.links['hrReports'] = '/admin/hr/reports/' +uuidV4();
    this.links['profileChangeRequests'] = '/admin/hr/profile-change-requests/' +uuidV4();
    this.links['preOnboardingForm'] = '/admin/hr/pre-onboarding-form/' +uuidV4();
this.links['userRoles'] = '/admin/settings/user-roles/' +uuidV4();



  }

  getLink(linkName: string): string {
    return this.links[linkName];
  }

  regenerateLinks(): void {
    this.generateLinks();
  }
}
