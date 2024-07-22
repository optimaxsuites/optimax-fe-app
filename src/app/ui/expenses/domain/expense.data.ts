export interface ExpenseData {
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
