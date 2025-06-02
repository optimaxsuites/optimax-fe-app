export interface ExpenseData {
category: any;
amount: any;
expenseDate: any;
merchant: any;
taxRate: any;
taxPercentage: any;
taxAmount: any;
payMethod: any;
project: any;
comments: any;
  id: string;
  eTitle: string;
  eProduct: string;
  eUnitPrice: number;
  eQuantity: number;
  eTaxes: number;
  eEmployment: string;
  eCompany: string;
  eDate: Date["toISOString"];
  eEmployee: string;
  eJournal: string;
  eNote: string;
  taxesArray: any[] | undefined;
  employeeArray: any[] | undefined;
  productArray: any[] | undefined;
  journalArray: any[] | undefined;
}
