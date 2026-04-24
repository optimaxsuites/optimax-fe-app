// ===== Common Types =====

export type Lookup = {
  id: number;
  name: string;
  code: string;
  description: string;
};

export type Media = {
  id: number;
  name: string;
  url: string;
  mediaNo: string;
};

// ===== Employee =====

export type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  email: string;
  workEmail: string;
  phone: string;
  address: string;
  jobTitle: string;
  supervisor: string;
  bankName: string;
  accountNumber: string;
  nin: string;
  bvn: string;
  employeeStatus: string;
  employementStartDate: string; // ISO datetime
  employmentEndDate: string; // ISO datetime
  onProbation: boolean;
  probationStartDate: string;
  probationEndDate: string;
  appraisalDueDate: string;
  jobType: Lookup;
  gender: Lookup;
  relationship: Lookup;
  religion: Lookup;
  maritalStatus: Lookup;
  department: Lookup;
  employeeMedia: Media;
  level: Lookup;
  userId: number;
  user?: any;
};

// ===== Allowance =====

export type Allowance = {
  id: number;
  amount: number;
  allowanceType: Lookup;
  level: Lookup;
};

// ===== Bonus =====

export type Bonus = {
  id: number;
  employee: Employee;
  amount: number;
  reason: string;
  createdAt: string;
  applied: boolean;
};

// ===== Deduction Detail =====

export type DeductionDetail = {
  id: number;
  name: string;
  amount: number;
  description: string;
  createdAt: string;
};

// ===== Deductions =====

export type Deductions = {
  id: number;
  employee: Employee;
  tax: number;
  pension: number;
  nhf: number;
  healthInsurance: number;
  advances: number;
  cooperatives: number;
  other: number;
  details: DeductionDetail[];
  createdAt: string;
};

// ===== Employee Payroll =====

export type EmployeePayroll = {
  id: number;
  employee: Employee;
  year: number;
  month: number;
  generatedAt: any;
  daysWorked: number;
  basePay: number;
  allowances: Allowance;
  bonuses: Bonus[];
  overtimePay: number;
  overtimeHours: number;
  grossPay: number;
  deductions: Deductions;
  totalDeductions: number;
  netPayable: number;
  createdAt: string;
};

// ===== Payroll Batch =====

export type Payroll = {
  id: number;
  month: number;
  year: number;
  generatedAt: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | string;
  employees: EmployeePayroll[];
  createdAt: string;
  updatedAt: string;
};