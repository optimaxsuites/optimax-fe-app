// payment-config.service.ts
import { Injectable } from '@angular/core';

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
}

export interface PaymentTypeConfig {
  type: 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
  label: string;
  icon: string;
  accountDetails: BankAccountDetails;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentConfigService {
  // Configure these with your actual accounting team's bank details
  private readonly paymentAccounts: Record<string, BankAccountDetails> = {
    PRINCIPAL_REPAYMENT: {
      bankName: 'Zenith Bank',
      accountName: 'Optimax Solutions - Principal Repayment',
      accountNumber: '1012345678',
      bankCode: '057'
    },
    INTEREST_PAYMENT: {
      bankName: 'First Bank',
      accountName: 'Optimax Solutions - Interest Payment',
      accountNumber: '2023456789',
      bankCode: '011'
    },
    LATE_FEE: {
      bankName: 'GTBank',
      accountName: 'Optimax Solutions - Late Fee',
      accountNumber: '3034567890',
      bankCode: '058'
    }
  };

  getPaymentTypes(): PaymentTypeConfig[] {
    return [
      {
        type: 'PRINCIPAL_REPAYMENT',
        label: 'Principal Payment',
        icon: 'fas fa-money-bill-wave',
        accountDetails: this.paymentAccounts.PRINCIPAL_REPAYMENT,
        description: 'Pay towards the principal amount of your loan'
      },
      {
        type: 'INTEREST_PAYMENT',
        label: 'Interest Payment',
        icon: 'fas fa-percent',
        accountDetails: this.paymentAccounts.INTEREST_PAYMENT,
        description: 'Pay accrued interest on your loan'
      },
      {
        type: 'LATE_FEE',
        label: 'Late Fee',
        icon: 'fas fa-exclamation-triangle',
        accountDetails: this.paymentAccounts.LATE_FEE,
        description: 'Pay any outstanding late fees'
      }
    ];
  }

  getAccountDetails(paymentType: string): BankAccountDetails {
    return this.paymentAccounts[paymentType] || this.paymentAccounts.PRINCIPAL_REPAYMENT;
  }
}