import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PaymentRecordType } from '../loan-payment-types';

export interface CooperativePaymentRecord {
  id: number;
  loanId: number;
  memberId: number;
  membershipId?: number;
  groupId?: number;
  paymentType: PaymentRecordType;
  installmentNumber: number;
  amount: number;
  principalApplied?: number;
  interestApplied?: number;
  lateFeeApplied?: number;
  remainingBalance?: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY' | 'OTHER';
  paymentReference: string;
  paidIntoAccount?: string;
  paidFromAccount?: string;
  paidAt: string;
  recordedBy?: number;
  recordedAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  notes?: string;
  receiptNumber?: string;
}

export interface CreateCooperativePaymentRecordPayload {
  loanId: number;
  memberId: number;
  membershipId?: number;
  groupId?: number;
  paymentType: PaymentRecordType;
  installmentNumber: number;
  amount: number;
  principalApplied?: number;
  interestApplied?: number;
  lateFeeApplied?: number;
  remainingBalance?: number;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY' | 'OTHER';
  paymentReference: string;
  paidIntoAccount?: string;
  paidFromAccount?: string;
  paidAt?: string;
  notes?: string;
  receiptNumber?: string;
  /** Defaults to COMPLETED. Payroll deductions are PENDING until the payroll run takes them from salary. */
  status?: CooperativePaymentRecord['status'];
}

@Injectable({ providedIn: 'root' })
export class CooperativePaymentRecordService {
  createPaymentRecord(payload: CreateCooperativePaymentRecordPayload): Observable<CooperativePaymentRecord> {
    const paidAt = payload.paidAt || new Date().toISOString();
    const recordedAt = new Date().toISOString();

    return of({
      id: Date.now(),
      ...payload,
      paidAt,
      recordedAt,
      recordedBy: this.getCurrentUserId(),
      status: payload.status ?? 'COMPLETED'
    });
  }

  private getCurrentUserId(): number | undefined {
    const rawUserId = String(sessionStorage.getItem('userid') || localStorage.getItem('userid') || '').trim();
    const parsedUserId = Number(rawUserId);
    return Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : undefined;
  }
}