export interface LoanRequestForm {
    id?: string; // optional
    employeeId: string;
    fullName: string;
    department: string;
    jobTitle: string;
    dateOfHire: string;
    annualSalary: number;
    workEmail: string;
    phoneNumber?: string; // optional
    eligibilityDeclaration: boolean;
    loanPurpose: string;
    loanAmount: number;
    repaymentPeriod: number; // in months
    acknowledgment: boolean;
    monthlyObligations: number;
    rentMortgage: number;
    otherEMIs: number;
    creditCardPayments: number;
    otherFixedCommitments: number;
    monthlyDeductionAmount: number;
    startDate: string;
    payrollAuthorization: boolean;
    accelerationClause: boolean;
    creditCheckConsent: boolean;
    employeeSignature: string; // could be a base64 string or URL to the signature image
    submissionDate: string;
    printedName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface Loan {
    id: string;
    employeeId: string;
    amount: number;
    status: 'ACTIVE' | 'COMPLETED' | 'OVERDUE';
    startDate: string;
    endDate: string;
    balance: number;
}


export interface RepaymentSchedule {
    loadId: string;
    schedule: RepaymentInstallment[];
}


export interface RepaymentInstallment {
    dueDate: Date;
    amountDue: number;
    principalComponent: number;
    interestComponent: number;
    status: 'PAID' | 'DUE' | 'OVERDUE';
    paymentDate?: Date; // optional

}