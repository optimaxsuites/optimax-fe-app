import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { QuotationStage } from '../../../domain/procurement.dto';
import { VendorQuoteItemLS, VendorQuoteLS } from '../../../domain/quotation.dto';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-vendor-quote-list',
  templateUrl: './vendor-quote-list.component.html',
  styleUrl: './vendor-quote-list.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class VendorQuoteListComponent {
   private readonly QUOTE_KEY = 'vendorQuotes';

  vendorUuid = '';
  quoteList: VendorQuoteLS[] = [];
  selectedQuote: VendorQuoteLS | null = null;
  displayQuoteView = false;

  columns = [
    { header: 'Title', field: 'title', sortable: true },
    { header: 'PRM No', field: 'prmNo', sortable: true },
    { header: 'Department', field: 'department', sortable: true },
    {
      header: 'Required By',
      field: 'requiredByDate',
      sortable: true,
      formatter: (row: VendorQuoteLS) =>
        row.requiredByDate
          ? new Date(row.requiredByDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '__',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      formatter: (row: VendorQuoteLS) => row.status ?? '__',
      badgeClass: (row: VendorQuoteLS) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
    {
      header: 'Submitted At',
      field: 'submittedAt',
      sortable: true,
      formatter: (row: VendorQuoteLS) =>
        row.submittedAt
          ? new Date(row.submittedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '__',
    },
  ];

  actions = [
    { id: 'view', label: 'View' },
    {
      id: 'edit',
      label: 'Edit',
      hidden: (row: VendorQuoteLS) => row.status !== 'Draft',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.vendorUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.loadQuotes();
  }

  loadQuotes(): void {
    const allQuotes: VendorQuoteLS[] = JSON.parse(
      localStorage.getItem(this.QUOTE_KEY) || '[]'
    );

  this.quoteList = allQuotes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  }

  openQuote(row: VendorQuoteLS): void {
    this.selectedQuote = { ...row };
    this.displayQuoteView = true;
  }

  closeQuoteView(): void {
    this.displayQuoteView = false;
    this.selectedQuote = null;
  }

  onAction(event: { actionId: string; row: VendorQuoteLS }): void {
    const { actionId, row } = event;

    if (actionId === 'view') {
      this.openQuote(row);
      return;
    }

    if (actionId === 'edit') {
      this.editQuote(row);
    }
  }

  canEditQuote(quote: VendorQuoteLS | null): boolean {
    return !!quote && quote.status === 'Draft';
  }

  editQuote(quote: VendorQuoteLS | null): void {
    if (!quote) return;

    if (quote.status !== 'Draft') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Edit Restricted',
        detail: 'Only draft quotes can be edited.',
        life: 3000,
      });
      return;
    }

    this.closeQuoteView();

    this.router.navigate([
      '/vendor-portal/quote-form',
      this.vendorUuid,
      'create',
      quote.prId,
    ]);
  }

  getGrandTotal(items: VendorQuoteItemLS[] = []): number {
    return items.reduce((sum, item) => sum + Number(item?.totalPrice || 0), 0);
  }

  formatDate(value?: string): string {
    if (!value) return '---';

    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private readonly statusClasses: Record<string, string> = {
    Draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    Submitted: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    UnderReview: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  };

  statusBadgeClass(status?: string): string {
    return (
      this.statusClasses[status || 'Draft'] ??
      'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
    );
  }
}
