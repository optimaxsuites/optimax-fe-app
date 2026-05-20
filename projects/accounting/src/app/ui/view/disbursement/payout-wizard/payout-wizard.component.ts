import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountingTransactionDTO } from '../../../domain/accounting.dto';

export interface Source {
  id: string;
  name: string;
  description: string;
  accountLabel: string;
}

export interface Recipient {
  name: string;
  account: string;
  amount: number;
  initials: string;
  color: string;
}

export interface AuditEntry {
  title: string;
  description: string;
  time: string;
  status: 'success' | 'approved' | 'initiated';
}

export interface Transaction {
  reference: string;
  amount: number;
  principal: number;
  interest: number;
  interestRate: number;
  code: string;
  recipient: {
    name: string;
    department: string;
    staffId: string;
    bank: string;
    account: string;
    accountType: string;
  };
  auditLog: AuditEntry[];
  security: {
    ip: string;
    browser: string;
  };
}

const AVATAR_COLORS = [
  '#1a7f64', '#2563eb', '#7c3aed', '#db2777',
  '#d97706', '#059669', '#dc2626', '#0891b2',
];

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function randomColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

@Component({
  selector: 'app-payout',
  templateUrl: './payout-wizard.component.html',
  styleUrl: './payout-wizard.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PayoutComponent implements OnInit {

  /** Controls which top-level view is shown */
  view: 'form' | 'detail' = 'form';

  // Stepper
  steps = ['Source', 'Recipients', 'Review'];
  currentStep = 1;

  // Sources
  sources: Source[] = [
    {
      id: 'hr',
      name: 'HR & Payroll Dept',
      description: 'Automated salary and benefit distributions.',
      accountLabel: 'Payroll (Ends in 4421)',
    },
    {
      id: 'ops',
      name: 'Operations Fund',
      description: 'Vendor payments and logistical expenses.',
      accountLabel: 'Operations (Ends in 7890)',
    },
  ];
  selectedSource: Source = this.sources[0];

  // Recipients
  recipients: Recipient[] = [];

  // ─── Data ──────────────────────────────────────────────────────────────────
  selectedTransactionData: AccountingTransactionDTO | null = null;
  sparkData = [20, 35, 30, 50, 45, 60, 55, 70, 65, 80, 75, 90];

  // Computed
  get totalAmount(): number {
    return this.recipients.reduce((s, r) => s + r.amount, 0);
  }

  // Transaction data (populated on confirm)
  transaction: Transaction = {
    reference: 'DISB-ADV-111-1777948063556-501-2341bf85',
    amount: 52000,
    principal: 40000,
    interest: 12000,
    interestRate: 30,
    code: 'ADV-111',
    recipient: {
      name: 'Eseose Odion',
      department: 'Information Technology',
      staffId: 'EMP-9920',
      bank: 'United Bank for Africa',
      account: '2157667512',
      accountType: 'Savings Account',
    },
    auditLog: [
      {
        title: 'Payment Successful',
        description: 'Transaction settled by Central Bank gateway.',
        time: 'Today, 02:28:10',
        status: 'success',
      },
      {
        title: "Approved by 'Ese Ose'",
        description: 'Manager override for advanced payout.',
        time: 'Today, 02:27:55',
        status: 'approved',
      },
      {
        title: "Initiated by 'eseose'",
        description: 'System request triggered via portal.',
        time: 'Today, 02:27:43',
        status: 'initiated',
      },
    ],
    security: {
      ip: '192.168.1.44',
      browser: 'Chrome (Secure)',
    },
  };

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras.state && nav.extras.state['transaction']) {
      this.selectedTransactionData = nav.extras.state['transaction'];
    }
  }

  ngOnInit(): void {
    if (this.selectedTransactionData) {
      this.populateRecipientsFromTransaction(this.selectedTransactionData);
    }
  }

  populateRecipientsFromTransaction(tx: AccountingTransactionDTO): void {
    const meta = tx.metadata || tx.accountingEvent?.metadata || tx.mappingMetadata?.metadata;
    if (!meta) return;

    if (Array.isArray(meta)) {
      this.recipients = meta.map((r, idx) => ({
        name: r.recipientName || r.accountName || r.employeeName || r.beneficiaryName || 'Unnamed Recipient',
        account: r.accountNumber || r.account || '—',
        amount: r.amount || 0,
        initials: initials(r.recipientName || r.accountName || r.employeeName || r.beneficiaryName || 'UR'),
        color: randomColor(idx)
      }));
    } else {
      this.recipients = [{
        name: meta.recipientName || meta.accountName || meta.employeeName || meta.beneficiaryName || 'Unnamed Recipient',
        account: meta.accountNumber || meta.account || '—',
        amount: tx.amount || meta.amount || 0,
        initials: initials(meta.recipientName || meta.accountName || meta.employeeName || meta.beneficiaryName || 'UR'),
        color: randomColor(0)
      }];
    }
  }

  goBackToTray(): void {
    this.router.navigate(['/disbursement']);
  }

  // Step navigation
  nextStep(): void {
    if (this.currentStep < this.steps.length) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Source selection
  selectSource(source: Source): void {
    this.selectedSource = source;
  }

  // Confirm payout -> switch to detail view
  confirmPayout(): void {
    const tx = this.selectedTransactionData;
    const meta = tx?.metadata || tx?.accountingEvent?.metadata || tx?.mappingMetadata?.metadata;
    
    this.transaction = {
      ...this.transaction,
      reference: tx?.transactionReference || (tx as any)?.uuid || tx?.id?.toString() || 'REF-PENDING',
      amount: this.totalAmount,
      principal: tx?.amount || this.totalAmount,
      interest: 0,
      interestRate: 0,
      code: tx?.sourceModule || 'PAYOUT',
      recipient: {
        name: this.recipients[0]?.name ?? 'N/A',
        department: meta?.department || meta?.dept || 'General',
        staffId: meta?.employeeId || meta?.staffId || '—',
        bank: meta?.bankName || meta?.bank || '—',
        account: this.recipients[0]?.account ?? 'N/A',
        accountType: 'External Disbursement',
      },
      auditLog: [
        {
          title: 'Payout Initiated',
          description: `Disbursement triggered from ${this.selectedSource.name}.`,
          time: new Date().toLocaleString(),
          status: 'initiated',
        },
        ...this.transaction.auditLog.slice(1)
      ]
    };
    this.view = 'detail';
  }
}