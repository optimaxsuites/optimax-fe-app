import { Injectable } from '@angular/core';
import { CooperativeLoanGroup } from './cooperative-loan/cooperative.types';

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
}

export interface PaymentTypeConfig {
  type: 'CONTRIBUTION' | 'PRINCIPAL_REPAYMENT' | 'INTEREST_REPAYMENT' | 'LATE_FEE';
  label: string;
  icon: string;
  accountDetails: BankAccountDetails;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentConfigService {
  // Configure these with your actual accounting team's bank details
  private readonly paymentAccounts: Record<string, BankAccountDetails> = {
    CONTRIBUTION: {
      bankName: 'Zenith Bank',
      accountName: 'Optimax Solutions - Cooperative Contributions',
      accountNumber: '0012345678',
      bankCode: '057'
    },
    PRINCIPAL_REPAYMENT: {
      bankName: 'Zenith Bank',
      accountName: 'Optimax Solutions - Principal Repayment',
      accountNumber: '1012345678',
      bankCode: '057'
    },
    INTEREST_REPAYMENT: {
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
        type: 'CONTRIBUTION',
        label: 'Contribution Payment',
        icon: 'fas fa-piggy-bank',
        accountDetails: this.paymentAccounts['CONTRIBUTION'],
        description: 'Post a contribution into the cooperative contribution account'
      },
      {
        type: 'PRINCIPAL_REPAYMENT',
        label: 'Principal Payment',
        icon: 'fas fa-money-bill-wave',
        accountDetails: this.paymentAccounts['PRINCIPAL_REPAYMENT'],
        description: 'Pay towards the principal amount of your loan'
      },
      {
        type: 'INTEREST_REPAYMENT',
        label: 'Interest Payment',
        icon: 'fas fa-percent',
        accountDetails: this.paymentAccounts['INTEREST_REPAYMENT'],
        description: 'Pay accrued interest on your loan'
      },
      {
        type: 'LATE_FEE',
        label: 'Late Fee',
        icon: 'fas fa-exclamation-triangle',
        accountDetails: this.paymentAccounts['LATE_FEE'],
        description: 'Pay any outstanding late fees'
      }
    ];
  }

  getAccountDetails(paymentType: string): BankAccountDetails {
    return this.paymentAccounts[paymentType] || this.paymentAccounts['PRINCIPAL_REPAYMENT'];
  }

  getCooperativePaymentTypes(group?: CooperativeLoanGroup | null): PaymentTypeConfig[] {
    return [
      {
        type: 'CONTRIBUTION',
        label: 'Contribution Payment',
        icon: 'fas fa-piggy-bank',
        accountDetails: this.getCooperativeAccountDetails('CONTRIBUTION', group),
        description: 'Route member contributions to the configured contribution account'
      },
      {
        type: 'PRINCIPAL_REPAYMENT',
        label: 'Principal Payment',
        icon: 'fas fa-money-bill-wave',
        accountDetails: this.getCooperativeAccountDetails('PRINCIPAL_REPAYMENT', group),
        description: 'Route principal repayments to the configured principal account'
      },
      {
        type: 'INTEREST_REPAYMENT',
        label: 'Interest Payment',
        icon: 'fas fa-percent',
        accountDetails: this.getCooperativeAccountDetails('INTEREST_REPAYMENT', group),
        description: 'Route interest repayments to the configured interest account'
      },
      {
        type: 'LATE_FEE',
        label: 'Late Fee',
        icon: 'fas fa-exclamation-triangle',
        accountDetails: this.getCooperativeAccountDetails('LATE_FEE', group),
        description: 'Route late-fee repayments to the configured late fee account'
      }
    ];
  }

  getCooperativeAccountDetails(
    paymentType: PaymentTypeConfig['type'],
    group?: CooperativeLoanGroup | null
  ): BankAccountDetails {
    if (!group) {
      return this.getAccountDetails(paymentType);
    }

    switch (paymentType) {
      case 'CONTRIBUTION':
        return {
          bankName: String(group.contributionsBankName || '').trim(),
          accountName: `${group.name} - Contributions`,
          accountNumber: String(group.contributionsAccount || '').trim(),
          bankCode: undefined
        };
      case 'PRINCIPAL_REPAYMENT':
        return {
          bankName: String(group.principalBankName || '').trim(),
          accountName: `${group.name} - Principal Repayment`,
          accountNumber: String(group.principalCollectionAccount || '').trim(),
          bankCode: undefined
        };
      case 'INTEREST_REPAYMENT':
        return {
          bankName: String(group.interestBankName || '').trim(),
          accountName: `${group.name} - Interest Repayment`,
          accountNumber: String(group.interestCollectionAccount || '').trim(),
          bankCode: undefined
        };
      case 'LATE_FEE':
        return {
          bankName: String(group.lateFeeBankName || '').trim(),
          accountName: `${group.name} - Late Fees`,
          accountNumber: String(group.lateFeeCollectionAccount || '').trim(),
          bankCode: undefined
        };
      default:
        return this.getAccountDetails(paymentType);
    }
  }

  hasValidAccountNumber(account: BankAccountDetails | null | undefined): boolean {
    return /^[0-9]{10}$/.test(String(account?.accountNumber || '').trim());
  }
}