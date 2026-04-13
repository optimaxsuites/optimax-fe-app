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

export interface UserDTO {
  id: number;
  username: string;
  email: string;
}

export interface AccountDTO {
  id: number;
  accountCode: number;
  accountName: string;
  accountType: AccountType;
  parentAccountId?: number;
  description?: string;
  currency: string;
  active: boolean;
  createdBy?: UserDTO;
  createdAt: Date;
}

export interface AccountMappingDTO {
  id: number;
  sourceModule: SourceModule;
  eventType: string;
  debitAccountId: number;
  creditAccountId: number;
  description?: string;
  createdBy?: UserDTO;
  createdAt: Date;
}

export interface AccountingTransactionDTO {
  id: number;
  transactionReference: string;
  sourceModule: SourceModule;
  amount: number;
  currency: string;
  Status: TransactionReviewStatus;
  AccountID: AccountDTO;
  externalReference?: string;
  description?: string;
  transactionDate: Date;
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
}

export interface TransactionReviewDTO {
  id: number;
  transactionId: AccountingTransactionDTO;
  reviewerId: UserDTO;
  reviewStatus: TransactionReviewStatus;
  comments?: string;
  reviewedAt: Date;
  createdBy: string;
}

export interface JournalEntryDTO {
  id: number;
  entryNumber: number;
  transactionId: AccountingTransactionDTO;
  entryDate: Date;
  description?: string;
  status: JournalEntryStatus;
  createdAt: Date;
}

export interface JournalEntryLineDTO {
  id: number;
  journalEntryId: JournalEntryDTO;
  accountId: AccountDTO;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  createdBy: string;
}

export interface BankTransactionDTO {
  id: number;
  bankAccountId: AccountDTO;
  externalReference?: string;
  amount: number;
  currency: string;
  transactionType: BankTransactionType;
  transactionDate: Date;
  description?: string;
  reconciled: boolean;
  source: string;
  createdBy: string;
  createdAt: Date;
}

export interface BankReconciliationDTO {
  id: number;
  bankAccountId: AccountDTO;
  statementDate: Date;
  openingBalance: number;
  closingBalance: number;
  status: ReconciliationStatus;
  createdBy: string;
  createdAt: Date;
}

export interface BankReconciliationLineDTO {
  id: number;
  reconciliationId: BankReconciliationDTO;
  bankTransactionId: BankTransactionDTO;
  journalEntryId: JournalEntryLineDTO;
  matchedAmount: number;
  status: ReconciliationStatus;
  createdBy: string;
}

export interface BankConnectionDTO {
  id: string;
  providerName: string;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  active: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface DisbursementDTO {
  id: number;
  transactionId: AccountingTransactionDTO;
  disbursementAmount: number;
  status: DisbursementStatus;
  disbursedFrom: 'CASH' | 'ACCOUNT';
  monifyReference?: string;
  disbursedAt?: Date;
  createdBy: string;
  createdAt: Date;
}
