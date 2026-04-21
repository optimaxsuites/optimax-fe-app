export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum SourceModule {
  POS = 'POS',
  HR = 'HR',
  HOSPITALITY = 'HOSPITALITY',
  EXPENSE = 'EXPENSE',
  BANK = 'BANK',
  MANUAL = 'MANUAL',
  MARKETPLACE = 'MARKETPLACE'
}

export enum AccountingTransactionStatus {
  PENDING = 'PENDING',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  FAILED = 'FAILED'
}

export enum TransactionReviewStatus {
  UNREVIEWED = 'UNREVIEWED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED'
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export enum ReconciliationStatus {
  UNMATCHED = 'UNMATCHED',
  MATCHED = 'MATCHED',
  PARTIALLY_MATCHED = 'PARTIALLY_MATCHED'
}

export enum BankTransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum DisbursementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DISBURSED = 'DISBURSED',
  FAILED = 'FAILED'
}

export enum AdvancedPaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CASH = 'CASH',
  PAYROLL_DEDUCTION = 'PAYROLL_DEDUCTION',
  MOBILE_MONEY = 'MOBILE_MONEY',
  OTHER = 'OTHER'
}

export enum AdvancedPaymentSubtype {
  PRINCIPAL_REPAYMENT = 'PRINCIPAL_REPAYMENT',
  INTEREST_REPAYMENT = 'INTEREST_REPAYMENT',
  LATE_FEE = 'LATE_FEE'
}

export enum AdvancedPaymentRecordStatus {
  PENDING = 'PENDING',
  PAID = 'PAID'
}

export interface EmployeesDTO {
  id: number;
  idNumber: string;
  fullName: string;
  bankName?: string;
  accountNumber?: string;
}

export interface UserDTO {
  id: number;
  fullname?: string;
  username: string;
  email: string;
  userId?: number;
  phoneNumber?: string;
  clientType?: string;
  gender?: string;
  accountId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AccountDTO {
  id: number;
  accountCode: number;
  accountName: string;
  accountType: AccountType;
  parentAccount?: AccountDTO;
  parentAccountId?: number; // For POST/PUT
  description?: string;
  currency: string;
  active: boolean;
  createdBy?: UserDTO | number;
  createdAt: Date | string;
  selected?: boolean; // UI helper
  balance?: number; // UI helper
  bankBalance?: number; // UI helper
}

export interface AccountMappingDTO {
  id: number;
  sourceModule: SourceModule;
  eventType: string;
  debitAccount: AccountDTO; // Expanded for GET
  creditAccount: AccountDTO; // Expanded for GET
  debitAccountId?: number; // For POST/PUT
  creditAccountId?: number; // For POST/PUT
  description?: string;
  createdBy?: UserDTO;
  createdAt: string;
}

export interface AccountingTransactionDTO {
  id: number;
  transactionReference: string;
  sourceModule: SourceModule;
  amount: number;
  currency: string;
  status: TransactionReviewStatus;
  Status?: TransactionReviewStatus; // Legacy alias
  reviewStatus?: TransactionReviewStatus; // Template alias
  account: AccountDTO; // Name changed to match JSON 'account'
  AccountID?: any; // Legacy alias
  accountId?: number; // For POST/PUT
  debitAmount?: number; // UI display helper
  creditAmount?: number; // UI display helper
  externalReference?: string;
  description?: string;
  transactionDate: string | Date;
  date?: string | Date; // Template alias
  createdBy: UserDTO | any;
  createdAt: string | Date;
  approvedBy?: string;
}

export interface DisbursementDTO {
  id: number;
  transactionId: AccountingTransactionDTO;
  disbursementAmount: number;
  status: DisbursementStatus;
  disbursedFrom: 'CASH' | 'ACCOUNT';
  monifyReference?: string;
  disbursedAt?: Date | string;
  createdBy: string | UserDTO;
  createdAt: Date | string;
}

export interface JournalEntryDTO {
  id: number;
  entryNumber: number;
  transaction: AccountingTransactionDTO; // Expanded
  transactionId?: number; // For POST/PUT
  entryDate: string;
  description?: string;
  status: JournalEntryStatus;
  createdAt: string;
}

export interface JournalEntryLineDTO {
  id: number;
  journalEntry: JournalEntryDTO; // Expanded
  journalEntryId?: number; // For POST/PUT
  account: AccountDTO; // Expanded
  accountId?: number; // For POST/PUT
  debitAmount: number;
  creditAmount: number;
  description?: string;
  createdBy: UserDTO;
}

export interface LedgerEntryDTO {
  id: number;
  account: AccountDTO; // Expanded
  accountId?: number; // For POST/PUT
  journalEntryLine: JournalEntryLineDTO; // Expanded
  journalEntryLineId?: number; // For POST/PUT
  debit: number;
  credit: number;
  balanceAfter: number;
  balance?: number; // Template alias
  description?: string; // Template alias
  currencyCode: string;
  entryDate: string;
  date?: string; // Template alias
  // Flattened from nested transaction — populated at runtime via mapping
  transactionReference?: string;
  sourceModule?: string;
  createdAt: string;
}

export interface AccountingEventDTO {
  id?: number;
  sourceModule: SourceModule;
  eventType: string | any;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  transactionDate: string;
  metadata?: any;
}

export enum AccountingEventType {
  LOAN_DISBURSEMENT = 'LOAN_DISBURSEMENT',
  PRINCIPLE_REPAYMENT = 'PRINCIPLE_REPAYMENT',
  INTEREST_REPAYMENT = 'INTEREST_REPAYMENT',
  LATE_FEE = 'LATE_FEE',
  CONTRIBUTION = 'CONTRIBUTION',
  PATRONAGE = 'PATRONAGE'
}

export interface PaginationResult<T> {
  content: T[];
  totalSize: number;
  page: number;
  size: number;
}

// ── Integration Models for Loan Management ───────────────

export interface AdvancedLoanDisbursementConfirmationDTO {
  id: number;
  loanId: any; // Ideally AdvancedLoanDTO from HR module
  disbursedAmount: number;
  disbursementConfirmedAt: Date;
  disbursementConfirmedBy: UserDTO;
  disburserInstructionReference: string;
  disbursementReference: string;
  paymentMethod: AdvancedPaymentMethod;
  notes?: string;
}

export interface AdvancedPaymentRecordDTO {
  id: number;
  paymentType: AdvancedPaymentSubtype;
  loanId: any;
  installmentNumber: number;
  amount: number;
  principalApplied: number;
  interestApplied: number;
  lateFeeApplied: number;
  remainingBalance: number;
  paymentMethod: AdvancedPaymentMethod;
  paymentReference: string;
  accountBankName: string;
  paidIntoAccount: string;
  paidFromAccount: EmployeesDTO;
  paidAt: Date;
  recordedBy: UserDTO;
  recordedAt: Date;
  status: AdvancedPaymentRecordStatus;
  notes?: string;
}

export interface CooperativeLoanDisbursementConfirmationDTO {
  id: number;
  loanId: any;
  disbursedAmount: number;
  disbursementConfirmedAt: Date;
  disbursementConfirmedBy: UserDTO;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: AdvancedPaymentMethod;
  notes?: string;
}

export interface CooperativePaymentRecordDTO {
  id: number;
  paymentType: any; // CooperativePaymentSubtype
  membershipId: any;
  loanId: any;
  installmentNumber: number;
  groupId: any;
  amount: number;
  principalApplied: number;
  interestApplied: number;
  lateFeeApplied: number;
  remainingBalance: number;
  paymentMethod: AdvancedPaymentMethod;
  paymentReference: string;
  paidIntoAccount: any;
  paidFromAccount: EmployeesDTO;
  paidAt: Date;
  recordedBy: UserDTO;
  recordedAt: Date;
  status: any;
  notes?: string;
}
