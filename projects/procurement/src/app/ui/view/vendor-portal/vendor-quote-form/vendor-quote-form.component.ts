import {
  Component,
  OnInit,
} from '@angular/core';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';
import { QuoteStatus, VendorQuoteItemLS, VendorQuoteLS } from '../../../domain/quotation.dto';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-vendor-quote-form',
  templateUrl: './vendor-quote-form.component.html',
  styleUrl: './vendor-quote-form.component.scss',
})
export class VendorQuoteFormComponent implements OnInit {
    private readonly PR_KEY = 'erp.purchaseRequisitions';
  private readonly QUOTE_KEY = 'vendorQuotes';
  vendorId = 0;
  prId = '';
  quote!: VendorQuoteLS;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

// ngOnInit(): void {
//     this.vendorUuid = this.route.snapshot.paramMap.get('vId') || '';
//     this.prId = Number(this.route.snapshot.paramMap.get('prId'));

//     const prs: PurchaseRequisitionLS[] = JSON.parse(
//       localStorage.getItem('erp.purchaseRequisitions') || '[]'
//     );

//     const pr = prs.find((x: PurchaseRequisitionLS) => Number(x.id) === this.prId);

//     if (!pr) {
//       this.router.navigate(['/vendor-portal/pr-list', this.vendorUuid]);
//       return;
//     }

//     const quotes: VendorQuoteLS[] = JSON.parse(
//       localStorage.getItem('vendorQuotes') || '[]'
//     );

//     const existingDraft = quotes.find(
//       (q: VendorQuoteLS) =>
//         q.prId === this.prId &&
//         q.vendorUuid === this.vendorUuid &&
//         q.status === QuoteStatus.Draft
//     );

//     if (existingDraft) {
//       this.quote = existingDraft;
//     } else {
//       this.quote = this.buildQuoteFromPr(pr, this.vendorUuid);
//     }
//   }


ngOnInit(): void {
  this.vendorId = Number(this.route.snapshot.paramMap.get('vId') || 0);
  this.prId = String(this.route.snapshot.paramMap.get('prId'));

  console.log('vendorUuid:', this.vendorId);
  console.log('prId:', this.prId);

  const prs: PurchaseRequisitionLS[] = JSON.parse(
    localStorage.getItem(this.PR_KEY) || '[]'
  );

  console.log('all PRs:', prs);

  const pr = prs.find((x: PurchaseRequisitionLS) => String(x.id) === this.prId);

  console.log('matched PR:', pr);

  if (!pr) {
    this.router.navigate(['/vendor-portal/pr-list', this.vendorId]);
    return;
  }

  const quotes: VendorQuoteLS[] = JSON.parse(
    localStorage.getItem(this.QUOTE_KEY) || '[]'
  );

  const existingDraft = quotes.find(
    (q: VendorQuoteLS) =>
      Number(q.prId) === Number(this.prId) &&
      Number(q.vendorId) === Number(this.vendorId) &&
      q.status === QuoteStatus.Draft
  );

  if (existingDraft) {
    this.quote = {
      ...existingDraft,
      items: [...(existingDraft.items || [])],
    };
  } else {
    this.quote = this.buildQuoteFromPr(pr, this.vendorId);
  }

  console.log('quote loaded:', this.quote);
}

  buildQuoteFromPr(
    pr: PurchaseRequisitionLS,
    vendorId: number,
  ): VendorQuoteLS {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),

      prId: pr.id,
      prmNo: pr.prmNo,
      vendorId,

      title: pr.title,
      department: pr.department,
      requiredByDate: pr.requiredByDate,

      status: QuoteStatus.Draft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      deliveryTimeline: '',
      validityDate: '',
      notes: '',

      items: pr.items.map((item) => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        category: item.category,

        // keep for internal logic but don't show in UI
        prBudgetCap: item.budgetCap,

        unitPrice: 0,
        totalPrice: 0,
        remarks: '',
      })),
    };
  }

   updateItemTotal(item: VendorQuoteItemLS): void {
    item.totalPrice = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    this.quote.updatedAt = new Date().toISOString();
  }

  getGrandTotal(): number {
    return (this.quote?.items || []).reduce(
      (sum, item) => sum + (Number(item.totalPrice) || 0),
      0
    );
  }

  canEditQuote(): boolean {
    return this.quote?.status === QuoteStatus.Draft;
  }

  canSubmitQuote(): boolean {
    if (!this.canEditQuote()) return false;

    const hasItems = (this.quote?.items || []).length > 0;
    const hasAllPrices = (this.quote?.items || []).every(
      item => Number(item.unitPrice) > 0
    );

    return hasItems && hasAllPrices;
  }

  saveDraft(): void {
    const uuid = crypto.randomUUID(); 
    if (!this.quote) return;

    this.quote.status = QuoteStatus.Draft;
    this.quote.updatedAt = new Date().toISOString();

    this.upsertQuote(this.quote);

    this.router.navigate(['/admin/procurement/vendor-portal/vendor-quote-list', uuid]);
  }

  submitQuote(): void {
    const uuid = crypto.randomUUID(); 

    if (!this.quote || !this.canSubmitQuote()) return;

    this.quote.status = QuoteStatus.Submitted;
    this.quote.submittedAt = new Date().toISOString();
    this.quote.updatedAt = new Date().toISOString();

    this.upsertQuote(this.quote);

    this.router.navigate(['/admin/procurement/vendor-portal/vendor-quote-list', uuid]);

  }

  upsertQuote(quote: VendorQuoteLS): void {
    const existing: VendorQuoteLS[] = JSON.parse(
      localStorage.getItem(this.QUOTE_KEY) || '[]'
    );

    const index = existing.findIndex(q => q.id === quote.id);

    if (index > -1) {
      existing[index] = quote;
    } else {
      existing.push(quote);
    }

    localStorage.setItem(this.QUOTE_KEY, JSON.stringify(existing));
  }

  goBack(): void {
    this.router.navigate(['/vendor-portal/pr-list', this.vendorId]);
  }

  formatDate(value?: string): string {
    if (!value) return '---';

    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusBadgeClass(status?: string): string {
    const classes: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-700',
      Submitted: 'bg-blue-100 text-blue-700',
      UnderReview: 'bg-amber-100 text-amber-700',
      Approved: 'bg-emerald-100 text-emerald-700',
      Rejected: 'bg-rose-100 text-rose-700',
    };

    return classes[status || 'Draft'] || 'bg-slate-100 text-slate-700';
  }
}
