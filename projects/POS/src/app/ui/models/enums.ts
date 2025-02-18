export const enum ProductCategories {
  NONE = 'Category', // This string is just a placeholder
  MEN_CLOTHING = "Men's Clothing",
  WOMEN_CLOTHING = "Women's Clothing",
  ELECTRONICS = 'Electronics',
  JEWELERY = 'Jewelery',
}

export const enum ProductExcelColumns {
  START = 0,

  NAME = 0,
  DESCRIPTION,
  // IMAGE_URL, // This may be unneeded
  BRANCH,
  CODE,
  BASE_PRICE,
  TAX_PERCENTAGE,
  // DISCOUNT_PERCENTAGE,
  DISCOUNT_NAME,
  // DISCOUNT_TYPE,
  QUANTITY,
  SKU,
  PART_NUMBER,
  CATEGORY,
  VARIANTS,
  ITEM_WEIGHT,

  // This only useful for knowing where to stop when looping
  END,
}

/**
 * NOTE: See `src/app/ui/sharedComponent/service/navigation-links/navigation-links.service.ts` for where the valued were gotten from. We're not meant to touch it so this is the best I can do.
 */
export const enum NavigationLinks {
  DASHBOARD = 'dashboardLink',
  USER_REGISTRATION = 'userRegistrationLink',
  SALES = 'salesLink',
  PURCHASE = 'purchaseLink',
  INVENTORY = 'inventoryLink',
  PROCUREMENT = 'procurementLink',
  PROCUREMENT_SETTINGS = 'procurementSettingsLink',
  RFQ = 'rfqLink',
  RFQ_FORM = 'rfqFormLink',
  ACCOUNTING = 'accountingLink',

  // human resources
  HR = 'hrLink',
  RECUITMENT = 'recuitmentLink',
  LEAVE = 'leaveLink',
  ATTENDANCE = 'attendanceLink',
  INTERVIEW = 'interviewLink',
  EMPLOYEE_MANAGEMENT = 'employeeManagementLink',
  PAYROLL = 'payroll',
  ALL_PAYSLIP = 'allPayslip',
  POS = 'posLink',
  CRM = 'crmLink',
  EXPENSES = 'expensesLink',
  ORDER_DETAILS = 'orderDetails',
  VENDOR = 'vendorLink',
  VENDOR_RFQ = 'vendorRfqLink',
  SIGNIN = 'signinLink',
  VRS = 'vrsLink',
  VRF = 'vrfLink',
  SIGNUP = 'signupLink',
  EMV = 'emvLink',
  VERIFY = 'verifyLink',
  CHECKOUT = 'checkoutLink',
  CHECKOUT_ORDER = 'checkoutOrderLink',
  CASH_PAYMENT = 'cashPayment',
  ORDER_REFUND = 'orderRefund',
  REQUEST_DETAILS = 'requestDetails',
  OPEN_REGISTER = 'openRegister',
  CLOSE_REGISTER = 'closeRegister',
  SETTINGS = 'settingsLink',
  GENERAL_SETTINGS = 'generalSettings',
  HR_SETTINGS = 'HRSettings',
}

export const enum StyleColor {
  CELADON_GREEN = '#2eb270',
}

export const enum BusinessType {
  PHARMACY = 'Pharmacy',
  RETAIL = 'Retail',
  RESTAURANT = 'Restaurant',
  HOTEL = 'Hotel',
}
