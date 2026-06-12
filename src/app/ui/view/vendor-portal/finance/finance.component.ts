import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { VendorService } from '../../../service/vendor-portal/vendor.service';
import { Invoice, FinanceStats } from '../../../domain/vendor-portal/vendor.dto';
import { TableColumn } from 'src/app/ui/shared-component/view/table/table.component';

type StatusFilter = 'all' | 'draft' | 'submitted' | 'approved' | 'paid' | 'overdue' | 'disputed';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  allInvoices: Invoice[] = [];
  invoices:    Invoice[] = [];
  stats:       FinanceStats | null = null;
  statusFilter: StatusFilter = 'all';

  // ── Invoice side panel ────────────────────────────────────────────────────────
  showPanel      = false;
  selectedInvoice: Invoice | null = null;

  readonly statusFilters: { label: string; value: StatusFilter }[] = [
    { label: 'All',       value: 'all' },
    { label: 'Draft',     value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Approved',  value: 'approved' },
    { label: 'Paid',      value: 'paid' },
    { label: 'Overdue',   value: 'overdue' },
    { label: 'Disputed',  value: 'disputed' },
  ];

  // 5 columns → 5 <td>s
  invoiceColumns: TableColumn[] = [
    { header: 'Invoice No.',  field: 'invoiceNumber', sortable: true },
    { header: 'Client',       field: 'clientName',    sortable: true },
    { header: 'Issued',       sortField: 'issuedDate', sortable: true,
      formatter: (r: Invoice) => this.fmtDate(r.issuedDate) },
    { header: 'Total',        align: 'right',
      formatter: (r: Invoice) => this.fmtCurrency(r.total, r.currency) },
    { header: 'Status',       field: 'status',        sortable: true },
  ];

  constructor(private vendorService: VendorService) {}

  ngOnInit(): void {
    this.vendorService.getInvoices()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.allInvoices = list;
        this.applyFilter();
      });
    this.vendorService.getFinanceStats().pipe(take(1)).subscribe(s => this.stats = s);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setFilter(f: StatusFilter): void {
    this.statusFilter = f;
    this.applyFilter();
  }

  private applyFilter(): void {
    this.invoices = this.statusFilter === 'all'
      ? this.allInvoices
      : this.allInvoices.filter(i => i.status === this.statusFilter);
  }

  onRowClick(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.showPanel = true;
  }

  closePanel(): void { this.showPanel = false; this.selectedInvoice = null; }

  downloadInvoice(inv: Invoice, e: MouseEvent): void {
    e.stopPropagation();
    console.log('[Finance] Download invoice:', inv.invoiceNumber);
  }

  // ── Formatting ────────────────────────────────────────────────────────────────
  fmtDate(d: Date | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmtCurrency(n: number, cur = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  }

  isOverdue(d: Date): boolean { return new Date(d) < new Date(); }

  paymentProgress(inv: Invoice): number {
    if (inv.total === 0) return 0;
    return Math.min(100, Math.round((inv.amountPaid / inv.total) * 100));
  }

  invoiceBadge(status: string): string {
    const m: Record<string, string> = {
      draft:     'badge-draft',
      submitted: 'badge-submitted',
      approved:  'badge-approved',
      paid:      'badge-paid',
      overdue:   'badge-overdue',
      disputed:  'badge-disputed',
    };
    return `badge ${m[status] ?? ''}`;
  }
}