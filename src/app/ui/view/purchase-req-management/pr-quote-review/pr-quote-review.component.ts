import { Component, OnInit } from '@angular/core';
import {
  ProcurementPrQuoteReviewRow,
  QuoteStatus,
  VendorQuoteLS,
} from '../../../domain/quotation.dto';
import {
  PRStatus,
  PurchaseRequisitionLS,
} from '../../../domain/procurement.dto';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-pr-quote-review',
  templateUrl: './pr-quote-review.component.html',
  styleUrl: './pr-quote-review.component.scss',
   providers: [MessageService, ConfirmationService]
})
export class PrQuoteReviewComponent implements OnInit {
  readonly PR_KEY = 'erp.purchaseRequisitions';
  readonly QUOTE_KEY = 'vendorQuotes';

  columns = [
    { field: 'prmNo', header: 'PR No' },
    { field: 'title', header: 'Title' },
    { field: 'department', header: 'Department' },
    { field: 'requiredByDate', header: 'Required By' },
    { field: 'quoteCount', header: 'Quotes Received' },
    { field: 'lowestQuote', header: 'Lowest Quote' },
    { field: 'highestQuote', header: 'Highest Quote' },
    {
      header: 'Decision Status',
      field: 'decisionStatus',
      sortable: true,
      formatter: (row: ProcurementPrQuoteReviewRow) =>
        row.decisionStatus ?? '__',
      badgeClass: (row: ProcurementPrQuoteReviewRow) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.decisionStatus),
    },
  ];

  actions = [{ id: 'view', label: 'View Quotes', icon: 'pi pi-eye' }];

  quoteColumns = [
    { field: 'vendorUuid', header: 'Vendor' },
    { field: 'submittedAt', header: 'Submitted At' },
    { field: 'computedTotal', header: 'Quote Total' },
    { field: 'deliveryTimeline', header: 'Delivery Timeline' },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      formatter: (row: VendorQuoteLS) => row.status ?? '__',
      badgeClass: (row: VendorQuoteLS) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
  ];

  quoteActions = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' },
    { id: 'approve', label: 'Approve', icon: 'pi pi-check' },
    { id: 'reject', label: 'Reject', icon: 'pi pi-times' },
  ];

  prQuoteReviewList: ProcurementPrQuoteReviewRow[] = [];

  selectedPr: PurchaseRequisitionLS | null = null;
  selectedPrQuotes: Array<VendorQuoteLS & { computedTotal: number }> = [];
  selectedQuote: (VendorQuoteLS & { computedTotal: number }) | null = null;

  displayPrQuoteView = false;
  displayQuoteView = false;

  summaryCards = {
    quoteCount: 0,
    lowestQuote: 0,
    highestQuote: 0,
    approvedCount: 0,
    rejectedCount: 0,
    submittedCount: 0,
    underReviewCount: 0,
  };

  constructor(
  private messageService: MessageService,
  private confirmationService: ConfirmationService
) {}

  ngOnInit(): void {
    this.loadPrQuoteReviewList();
  }

  statusBadgeClass(status?: string): string {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700';

      case 'Submitted':
        return 'bg-amber-100 text-amber-700';

      case 'UnderReview':
        return 'bg-sky-100 text-sky-700';

      case 'Approved':
        return 'bg-emerald-100 text-emerald-700';

      case 'Rejected':
        return 'bg-rose-100 text-rose-700';

      case 'Cancelled':
        return 'bg-slate-200 text-slate-700';

      case 'Converted':
        return 'bg-purple-100 text-purple-700';

      case 'Quote Approved':
        return 'bg-emerald-100 text-emerald-700';

      case 'Pending Review':
        return 'bg-amber-100 text-amber-700';

      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  onAction(event: {
    actionId: string;
    row: ProcurementPrQuoteReviewRow;
  }): void {
    const { actionId, row } = event;

    if (actionId === 'view') {
      this.openPrReview(row);
      return;
    }
  }

  onQuoteAction(event: {
    actionId: string;
    row: VendorQuoteLS & { computedTotal: number };
  }): void {
    const { actionId, row } = event;

    if (actionId === 'view') {
      this.openQuote(row);
      return;
    }

    if (actionId === 'approve') {
      if (this.canApprove(row)) {
        this.confirmApproveQuote(row);
      }
      return;
    }

    if (actionId === 'reject') {
      if (this.canReject(row)) {
        this.confirmRejectQuote(row);
      }
    }
  }

  loadPrQuoteReviewList(): void {
    const prs = this.getAllPrs();
    const quotes = this.getAllQuotes().filter(
      (q) => q.status !== QuoteStatus.Draft,
    );

    this.prQuoteReviewList = prs
      .map((pr): ProcurementPrQuoteReviewRow | null => {
        const prQuotes = quotes.filter((q) => q.prId === pr.id);
        if (!prQuotes.length) return null;

        const totals = prQuotes.map((q) => this.getQuoteTotal(q));
        const hasApprovedQuote = prQuotes.some(
          (q) => q.status === QuoteStatus.Approved,
        );

        return {
          id: pr.id,
          prId: pr.id,
          prmNo: pr.prmNo,
          title: pr.title,
          department: pr.department,
          requiredByDate: pr.requiredByDate,
          quoteCount: prQuotes.length,
          lowestQuote: totals.length ? Math.min(...totals) : 0,
          highestQuote: totals.length ? Math.max(...totals) : 0,
          decisionStatus: hasApprovedQuote
            ? 'Quote Approved'
            : 'Pending Review',
        };
      })
      .filter((row): row is ProcurementPrQuoteReviewRow => !!row);
  }

  openPrReview(row: ProcurementPrQuoteReviewRow): void {
    this.selectedPr = this.getAllPrs().find((pr) => pr.id === row.prId) || null;

    this.selectedPrQuotes = this.getAllQuotes()
      .filter((q) => q.prId === row.prId && q.status !== QuoteStatus.Draft)
      .map((q) => ({
        ...q,
        computedTotal: this.getQuoteTotal(q),
      }));

    this.buildSummaryCards();
    this.displayPrQuoteView = true;
  }

  closePrQuoteView(): void {
    this.displayPrQuoteView = false;
    this.selectedPr = null;
    this.selectedPrQuotes = [];
  }

  openQuote(quote: VendorQuoteLS & { computedTotal: number }): void {
    this.selectedQuote = quote;
    this.displayQuoteView = true;
  }

  closeQuoteView(): void {
    this.displayQuoteView = false;
    this.selectedQuote = null;
  }

  // approveQuote(selectedQuote: VendorQuoteLS): void {
  //   const allQuotes = this.getAllQuotes();
  //   const now = new Date().toISOString();

  //   const updatedQuotes = allQuotes.map((quote) => {
  //     if (quote.prId !== selectedQuote.prId) return quote;

  //     if (quote.id === selectedQuote.id) {
  //       return {
  //         ...quote,
  //         status: QuoteStatus.Approved,
  //         approvedAt: now,
  //         approvedBy: 'Procurement',
  //         updatedAt: now,
  //       };
  //     }

  //     if (
  //       quote.status === QuoteStatus.Submitted ||
  //       quote.status === QuoteStatus.UnderReview
  //     ) {
  //       return {
  //         ...quote,
  //         status: QuoteStatus.Rejected,
  //         rejectedAt: now,
  //         rejectionReason: 'Another vendor quote was selected for this PR.',
  //         updatedAt: now,
  //       };
  //     }

  //     return quote;
  //   });

  //   localStorage.setItem(this.QUOTE_KEY, JSON.stringify(updatedQuotes));
  //   this.updatePrWithWinningQuote(selectedQuote);
  //   this.refreshSelectedPrQuotes(selectedQuote.prId);
  //   this.loadPrQuoteReviewList();

  //   if (this.selectedQuote?.id === selectedQuote.id) {
  //     this.selectedQuote =
  //       this.selectedPrQuotes.find((q) => q.id === selectedQuote.id) || null;
  //   }
  // }

  // rejectQuote(quoteToReject: VendorQuoteLS): void {
  //   const rejectionReason = prompt('Enter rejection reason')?.trim();
  //   if (!rejectionReason) return;

  //   const allQuotes = this.getAllQuotes();
  //   const now = new Date().toISOString();

  //   const updatedQuotes = allQuotes.map((quote) => {
  //     if (quote.id !== quoteToReject.id) return quote;

  //     return {
  //       ...quote,
  //       status: QuoteStatus.Rejected,
  //       rejectedAt: now,
  //       rejectionReason,
  //       updatedAt: now,
  //     };
  //   });

  //   localStorage.setItem(this.QUOTE_KEY, JSON.stringify(updatedQuotes));
  //   this.refreshSelectedPrQuotes(quoteToReject.prId);
  //   this.loadPrQuoteReviewList();

  //   if (this.selectedQuote?.id === quoteToReject.id) {
  //     this.selectedQuote =
  //       this.selectedPrQuotes.find((q) => q.id === quoteToReject.id) || null;
  //   }
  // }

  confirmApproveQuote(selectedQuote: VendorQuoteLS): void {
  if (!this.canApprove(selectedQuote)) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Action Not Allowed',
      detail: `Only submitted or under-review quotes can be approved.`,
    });
    return;
  }

  this.confirmationService.confirm({
    header: 'Approve Quote',
    message: `Are you sure you want to approve this quote for PR ${selectedQuote.prmNo}? Other submitted quotes for this PR will be rejected automatically.`,
    icon: 'pi pi-check-circle',
    acceptLabel: 'Approve',
    rejectLabel: 'Cancel',
    acceptButtonStyleClass: 'p-button-success',
    accept: () => {
      this.approveQuote(selectedQuote);

      this.messageService.add({
        severity: 'success',
        summary: 'Quote Approved',
        detail: `The quote for PR ${selectedQuote.prmNo} was approved successfully.`,
      });
    },
  });
}

approveQuote(selectedQuote: VendorQuoteLS): void {
  const allQuotes = this.getAllQuotes();
  const now = new Date().toISOString();

  const updatedQuotes = allQuotes.map((quote) => {
    if (quote.prId !== selectedQuote.prId) return quote;

    if (quote.id === selectedQuote.id) {
      return {
        ...quote,
        status: QuoteStatus.Approved,
        approvedAt: now,
        approvedBy: 'Procurement',
        updatedAt: now,
      };
    }

    if (
      quote.status === QuoteStatus.Submitted ||
      quote.status === QuoteStatus.UnderReview
    ) {
      return {
        ...quote,
        status: QuoteStatus.Rejected,
        rejectedAt: now,
        rejectionReason: 'Another vendor quote was selected for this PR.',
        updatedAt: now,
      };
    }

    return quote;
  });

  localStorage.setItem(this.QUOTE_KEY, JSON.stringify(updatedQuotes));
  this.updatePrWithWinningQuote(selectedQuote);
  this.refreshSelectedPrQuotes(selectedQuote.prId);
  this.loadPrQuoteReviewList();

  if (this.selectedQuote?.id === selectedQuote.id) {
    this.selectedQuote =
      this.selectedPrQuotes.find((q) => q.id === selectedQuote.id) || null;
  }
}

confirmRejectQuote(quoteToReject: VendorQuoteLS): void {
  if (!this.canReject(quoteToReject)) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Action Not Allowed',
      detail: `Only submitted or under-review quotes can be rejected.`,
    });
    return;
  }

  this.confirmationService.confirm({
    header: 'Reject Quote',
    message: `Are you sure you want to reject this quote for PR ${quoteToReject.prmNo}?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Reject',
    rejectLabel: 'Cancel',
    acceptButtonStyleClass: 'p-button-danger',
    accept: () => {
      const rejectionReason = prompt('Enter rejection reason')?.trim();

      if (!rejectionReason) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Rejection Cancelled',
          detail: 'A rejection reason is required.',
        });
        return;
      }

      this.rejectQuote(quoteToReject, rejectionReason);

      this.messageService.add({
        severity: 'success',
        summary: 'Quote Rejected',
        detail: `The quote for PR ${quoteToReject.prmNo} was rejected successfully.`,
      });
    },
  });
}

rejectQuote(quoteToReject: VendorQuoteLS, rejectionReason: string): void {
  const allQuotes = this.getAllQuotes();
  const now = new Date().toISOString();

  const updatedQuotes = allQuotes.map((quote) => {
    if (quote.id !== quoteToReject.id) return quote;

    return {
      ...quote,
      status: QuoteStatus.Rejected,
      rejectedAt: now,
      rejectionReason,
      updatedAt: now,
    };
  });

  localStorage.setItem(this.QUOTE_KEY, JSON.stringify(updatedQuotes));
  this.refreshSelectedPrQuotes(quoteToReject.prId);
  this.loadPrQuoteReviewList();

  if (this.selectedQuote?.id === quoteToReject.id) {
    this.selectedQuote =
      this.selectedPrQuotes.find((q) => q.id === quoteToReject.id) || null;
  }
}

  markUnderReview(quote: VendorQuoteLS): void {
    const allQuotes = this.getAllQuotes();
    const now = new Date().toISOString();

    const updatedQuotes = allQuotes.map((q) => {
      if (q.id !== quote.id) return q;

      return {
        ...q,
        status: QuoteStatus.UnderReview,
        updatedAt: now,
      };
    });

    localStorage.setItem(this.QUOTE_KEY, JSON.stringify(updatedQuotes));
    this.refreshSelectedPrQuotes(quote.prId);
    this.loadPrQuoteReviewList();

    if (this.selectedQuote?.id === quote.id) {
      this.selectedQuote =
        this.selectedPrQuotes.find((q) => q.id === quote.id) || null;
    }
  }

  refreshSelectedPrQuotes(prId: number): void {
    this.selectedPrQuotes = this.getAllQuotes()
      .filter((q) => q.prId === prId && q.status !== QuoteStatus.Draft)
      .map((q) => ({
        ...q,
        computedTotal: this.getQuoteTotal(q),
      }));

    this.buildSummaryCards();

    if (this.selectedPr) {
      this.selectedPr =
        this.getAllPrs().find((pr) => pr.id === prId) || this.selectedPr;
    }
  }

  updatePrWithWinningQuote(selectedQuote: VendorQuoteLS): void {
    const prs = this.getAllPrs();
    const now = new Date().toISOString();

    const updatedPrs = prs.map((pr) => {
      if (pr.id !== selectedQuote.prId) return pr;

      return {
        ...pr,
        status: 'Converted' as PRStatus,
        selectedQuoteId: selectedQuote.id,
        selectedVendorUuid: selectedQuote.vendorUuid,
        quoteDecisionAt: now,
      };
    });

    localStorage.setItem(this.PR_KEY, JSON.stringify(updatedPrs));
  }

  buildSummaryCards(): void {
    const totals = this.selectedPrQuotes.map((q) => q.computedTotal);

    this.summaryCards = {
      quoteCount: this.selectedPrQuotes.length,
      lowestQuote: totals.length ? Math.min(...totals) : 0,
      highestQuote: totals.length ? Math.max(...totals) : 0,
      approvedCount: this.selectedPrQuotes.filter(
        (q) => q.status === QuoteStatus.Approved,
      ).length,
      rejectedCount: this.selectedPrQuotes.filter(
        (q) => q.status === QuoteStatus.Rejected,
      ).length,
      submittedCount: this.selectedPrQuotes.filter(
        (q) => q.status === QuoteStatus.Submitted,
      ).length,
      underReviewCount: this.selectedPrQuotes.filter(
        (q) => q.status === QuoteStatus.UnderReview,
      ).length,
    };
  }

  getQuoteTotal(quote: VendorQuoteLS): number {
    return (quote.items || []).reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );
  }

  getAllPrs(): PurchaseRequisitionLS[] {
    return JSON.parse(localStorage.getItem(this.PR_KEY) || '[]');
  }

  getAllQuotes(): VendorQuoteLS[] {
    return JSON.parse(localStorage.getItem(this.QUOTE_KEY) || '[]');
  }

  canApprove(quote: VendorQuoteLS): boolean {
    return (
      quote.status === QuoteStatus.Submitted ||
      quote.status === QuoteStatus.UnderReview
    );
  }

  canReject(quote: VendorQuoteLS): boolean {
    return (
      quote.status === QuoteStatus.Submitted ||
      quote.status === QuoteStatus.UnderReview
    );
  }

  canMarkUnderReview(quote: VendorQuoteLS): boolean {
    return quote.status === QuoteStatus.Submitted;
  }

  formatCurrency(amount: number, currencyCode: string = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  }
}
