import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AccountingTransactionDTO, DisbursementDTO, DisbursementStatus, TransactionReviewStatus } from '../ui/domain/accounting.dto';

@Injectable({
  providedIn: 'root'
})
export class DisbursementService {

  constructor() { }

  getApprovedTransactions(): Observable<AccountingTransactionDTO[]> {
    const mockTransactions: AccountingTransactionDTO[] = [
      {
        id: 1,
        transactionReference: 'TRX-001',
        sourceModule: 'EXPENSE' as any,
        amount: 25000,
        currency: 'NGN',
        status: TransactionReviewStatus.APPROVED,
        account: { id: 101, accountName: 'Miscellaneous Expense', accountCode: 5001, accountNumber: '0124578930', bankName: 'Access Bank' } as any,
        transactionDate: new Date('2026-03-18'),
        createdBy: 'Amara Okafor',
        approvedBy: 'Alice Johnson',
        description: 'Office supplies and miscellaneous purchases for Q1',
        externalReference: 'VENDOR-SUPPLY-0091',
        createdAt: new Date()
      },
      {
        id: 2,
        transactionReference: 'TRX-002',
        sourceModule: 'HR' as any,
        amount: 350000,
        currency: 'NGN',
        status: TransactionReviewStatus.APPROVED,
        account: { id: 102, accountName: 'Salary Payable', accountCode: 2001, accountNumber: '3021456789', bankName: 'GTBank' } as any,
        transactionDate: new Date('2026-03-18'),
        createdBy: 'Chidi Nwachukwu',
        approvedBy: 'Sarah Smith',
        description: 'Staff salary disbursement for February 2026',
        externalReference: 'PAYROLL-FEB-2026',
        createdAt: new Date()
      },
      {
        id: 3,
        transactionReference: 'TRX-003',
        sourceModule: 'PROCUREMENT' as any,
        amount: 87500,
        currency: 'NGN',
        status: TransactionReviewStatus.APPROVED,
        account: { id: 103, accountName: 'Vendor Payable', accountCode: 2050, accountNumber: '1100234567', bankName: 'Zenith Bank' } as any,
        transactionDate: new Date('2026-03-17'),
        createdBy: 'Fatima Bello',
        approvedBy: 'David Park',
        description: 'Payment for IT equipment procurement — Invoice INV-2034',
        externalReference: 'INV-2034',
        createdAt: new Date()
      },
      {
        id: 4,
        transactionReference: 'TRX-004',
        sourceModule: 'UTILITY' as any,
        amount: 18000,
        currency: 'NGN',
        status: TransactionReviewStatus.APPROVED,
        account: { id: 104, accountName: 'Utilities Expense', accountCode: 5100, accountNumber: 'CASH-PETTY-001', bankName: 'Petty Cash' } as any,
        transactionDate: new Date('2026-03-17'),
        createdBy: 'Emeka Eze',
        approvedBy: 'Alice Johnson',
        description: 'Monthly internet and electricity settlement',
        externalReference: 'UTIL-MAR-04',
        createdAt: new Date()
      },
      {
        id: 5,
        transactionReference: 'TRX-005',
        sourceModule: 'MAINTENANCE' as any,
        amount: 112000,
        currency: 'NGN',
        status: TransactionReviewStatus.APPROVED,
        account: { id: 105, accountName: 'Maintenance Expense', accountCode: 5200, accountNumber: '2201039845', bankName: 'First Bank' } as any,
        transactionDate: new Date('2026-03-16'),
        createdBy: 'Sade Abubakar',
        approvedBy: 'Sarah Smith',
        description: 'Generator maintenance and spare parts for Q1',
        externalReference: 'MAINT-GEN-033',
        createdAt: new Date()
      }
    ];
    return of(mockTransactions);
  }

  disburse(transactionId: number, amount: number, source: 'CASH' | 'ACCOUNT'): Observable<DisbursementDTO> {
    const mockDisbursement: DisbursementDTO = {
      id: Math.floor(Math.random() * 1000),
      transactionId: { id: transactionId } as any,
      disbursementAmount: amount,
      status: DisbursementStatus.DISBURSED,
      disbursedFrom: source,
      monifyReference: source === 'ACCOUNT' ? `MON-${Math.random().toString(36).substring(7).toUpperCase()}` : undefined,
      disbursedAt: new Date(),
      createdBy: 'System',
      createdAt: new Date()
    };
    return of(mockDisbursement);
  }
}
