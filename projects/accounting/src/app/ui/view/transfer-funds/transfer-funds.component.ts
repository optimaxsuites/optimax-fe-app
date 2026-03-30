import { Component, OnInit } from '@angular/core';

interface Account {
  code: string;
  name: string;
  type: string;
  details: string;
  balance: number;
  bankBalance: number;
}

interface TransferRecord {
  id: string;
  date: Date;
  fromAccount: string;
  toAccount: string;
  amount: number;
  description: string;
  status: 'Completed' | 'Pending' | 'Failed';
}

@Component({
  selector: 'app-transfer-funds',
  templateUrl: './transfer-funds.component.html',
  styleUrls: ['./transfer-funds.component.scss']
})
export class TransferFundsComponent implements OnInit {
  
  // Form Data
  sourceAccountId: string = '';
  destinationAccountId: string = '';
  amount: number = 0;
  transferDate: string = '';
  description: string = '';
  
  // Available accounts (in real app, fetch from service)
  accounts: Account[] = [
    { code: '1010', name: 'Cash', type: 'Asset', details: 'Physical cash on hand', balance: 150000, bankBalance: 0 },
    { code: '1020', name: 'Bank Account - GTB', type: 'Asset', details: 'GTBank Main Account', balance: 0, bankBalance: 850000 },
    { code: '1021', name: 'Bank Account - Access', type: 'Asset', details: 'Access Bank Operations', balance: 0, bankBalance: 420000 },
    { code: '1030', name: 'Petty Cash', type: 'Asset', details: 'Office petty cash', balance: 25000, bankBalance: 0 },
    { code: '1040', name: 'Savings Account', type: 'Asset', details: 'Savings for equipment', balance: 0, bankBalance: 500000 },
  ];

  // Recent transfers
  recentTransfers: TransferRecord[] = [
    { id: 'TRF-001', date: new Date('2026-02-03'), fromAccount: 'Cash', toAccount: 'Bank Account - GTB', amount: 50000, description: 'Cash deposit for clearance', status: 'Completed' },
    { id: 'TRF-002', date: new Date('2026-02-02'), fromAccount: 'Bank Account - GTB', toAccount: 'Savings Account', amount: 100000, description: 'Monthly savings transfer', status: 'Completed' },
    { id: 'TRF-003', date: new Date('2026-02-01'), fromAccount: 'Petty Cash', toAccount: 'Cash', amount: 5000, description: 'Replenish petty cash', status: 'Completed' },
  ];

  // State Management
  showConfirmModal: boolean = false;
  isLoading: boolean = false;
  showSuccessMessage: boolean = false;
  showErrorMessage: boolean = false;
  errorMessage: string = '';
  
  constructor() { }

  ngOnInit(): void {
    const today = new Date();
    this.transferDate = today.toISOString().split('T')[0];
  }

  // Get account by code
  getAccount(accountCode: string): Account | undefined {
    return this.accounts.find(acc => acc.code === accountCode);
  }

  // Get source account balance
  getSourceBalance(): number {
    const account = this.getAccount(this.sourceAccountId);
    if (!account) return 0;
    return account.balance > 0 ? account.balance : account.bankBalance;
  }

  // Get destination account balance
  getDestinationBalance(): number {
    const account = this.getAccount(this.destinationAccountId);
    if (!account) return 0;
    return account.balance > 0 ? account.balance : account.bankBalance;
  }

  // Calculate resulting balances
  getResultingSourceBalance(): number {
    return this.getSourceBalance() - this.amount;
  }

  getResultingDestinationBalance(): number {
    return this.getDestinationBalance() + this.amount;
  }

  // Validation
  isFormValid(): boolean {
    return (
      this.sourceAccountId !== '' &&
      this.destinationAccountId !== '' &&
      this.sourceAccountId !== this.destinationAccountId &&
      this.amount > 0 &&
      this.amount <= this.getSourceBalance() &&
      this.transferDate !== '' &&
      this.description.trim() !== ''
    );
  }

  isSufficientBalance(): boolean {
    return this.amount <= this.getSourceBalance();
  }

  isSameAccount(): boolean {
    return this.sourceAccountId !== '' && 
           this.destinationAccountId !== '' && 
           this.sourceAccountId === this.destinationAccountId;
  }

  // Format currency
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(value);
  }

  // Transfer processing
  openConfirmModal(): void {
    if (this.isFormValid()) {
      this.showConfirmModal = true;
    }
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  processTransfer(): void {
    this.isLoading = true;
    this.showConfirmModal = false;

    const referenceId = 'TRF-' + Date.now();

    setTimeout(() => {
      try {
        const sourceAccount = this.getAccount(this.sourceAccountId);
        const destAccount = this.getAccount(this.destinationAccountId);

        if (sourceAccount && destAccount) {
          // Update balances
          if (sourceAccount.balance > 0) {
            sourceAccount.balance -= this.amount;
          } else {
            sourceAccount.bankBalance -= this.amount;
          }

          if (destAccount.balance > 0 || destAccount.type === 'Asset') {
            destAccount.balance += this.amount;
          } else {
            destAccount.bankBalance += this.amount;
          }

          // Add to recent transfers
          this.recentTransfers.unshift({
            id: referenceId,
            date: new Date(this.transferDate),
            fromAccount: sourceAccount.name,
            toAccount: destAccount.name,
            amount: this.amount,
            description: this.description,
            status: 'Completed'
          });

          this.isLoading = false;
          this.showSuccessMessage = true;

          setTimeout(() => {
            this.resetForm();
            this.showSuccessMessage = false;
          }, 3000);
        }
      } catch (error) {
        this.isLoading = false;
        this.showErrorMessage = true;
        this.errorMessage = 'An error occurred while processing the transfer.';
        
        setTimeout(() => {
          this.showErrorMessage = false;
        }, 5000);
      }
    }, 1000);
  }

  resetForm(): void {
    this.sourceAccountId = '';
    this.destinationAccountId = '';
    this.amount = 0;
    this.description = '';
    const today = new Date();
    this.transferDate = today.toISOString().split('T')[0];
  }

  // Status color helper
  getStatusColor(status: string): string {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
