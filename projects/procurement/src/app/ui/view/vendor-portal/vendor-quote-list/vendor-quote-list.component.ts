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

  vendorId: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.setRandomVendorId();
    this.vendorUuid = this.route.snapshot.paramMap.get('uuid') || '';
    this.loadQuotes();
    
  }

  // loadQuotes(): void {
  //   const allQuotes: VendorQuoteLS[] = JSON.parse(
  //     localStorage.getItem(this.QUOTE_KEY) || '[]'
  //   );

  // this.quoteList = allQuotes.sort(
  //   (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  // );
  // }



 setRandomVendorId(): void {
  const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

  if (!Array.isArray(vendors) || !vendors.length) {
    console.warn('No vendors found in localStorage');
    this.vendorId = '';
    return;
  }

  const approvedVendors = vendors.filter(
    (vendor: any) => vendor?.status === 'Approved'
  );

  if (!approvedVendors.length) {
    console.warn('No approved vendors found in localStorage');
    this.vendorId = '';
    return;
  }

  const randomIndex = Math.floor(Math.random() * approvedVendors.length);
  const randomVendor = approvedVendors[randomIndex];

  this.vendorId = String(randomVendor.id);
  console.log(this.vendorId);
}

private departments = [
  {
    id: 'd1',
    name: 'Administration & Office Services',
    categories: ['Office Supplies', 'Printing & Branding'],
  },
  {
    id: 'd2',
    name: 'Information Technology',
    categories: [
      'IT Equipment & Hardware',
      'Software & Licensing',
      'Telecommunications',
    ],
  },
  {
    id: 'd3',
    name: 'Finance & Professional Services',
    categories: ['Consulting Services', 'Training & Capacity Building'],
  },
  {
    id: 'd4',
    name: 'Engineering & Construction',
    categories: [
      'Construction & Civil Works',
      'Electrical & Engineering Services',
    ],
  },
  {
    id: 'd5',
    name: 'Facilities & Operations',
    categories: ['Facility Management', 'Security Services'],
  },
  {
    id: 'd6',
    name: 'Supply Chain & Logistics',
    categories: ['Logistics & Transportation'],
  },
  {
    id: 'd7',
    name: 'Healthcare & Medical',
    categories: ['Medical Supplies'],
  },
  {
    id: 'd8',
    name: 'Marketing & Communications',
    categories: ['Marketing & Advertising', 'Printing & Branding'],
  },
  {
    id: 'd9',
    name: 'Hospitality & Events',
    categories: ['Catering Services'],
  },
];

private getCurrentVendor(): any | null {
  const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

  return (
    vendors.find(
      (vendor: any) => String(vendor.id) === String(this.vendorId)
    ) || null
  );
}

private getDepartmentById(departmentId: string): any | null {
  return (
    this.departments.find(
      (d) => String(d.id).trim() === String(departmentId).trim()
    ) || null
  );
}

private getDepartmentName(departmentId: string): string {
  const department = this.getDepartmentById(departmentId);
  return department ? department.name : String(departmentId || '');
}

private getVendorCategoryNames(vendor: any): string[] {
  const categories = vendor?.category || vendor?.categories || [];

  return categories
    .map((cat: any) => String(cat?.name || '').trim().toLowerCase())
    .filter((name: string) => !!name);
}

private isPrRelatedToVendor(pr: any, vendor: any): boolean {
  const department = this.getDepartmentById(pr.department);

  if (!department) {
    return false;
  }

  const vendorCategoryNames = this.getVendorCategoryNames(vendor);

  if (!vendorCategoryNames.length) {
    return false;
  }

  const allowedCategories = (department.categories || []).map(
    (category: string) => category.trim().toLowerCase()
  );

  return vendorCategoryNames.some((vendorCategory: string) =>
    allowedCategories.includes(vendorCategory)
  );
}

loadQuotes(): void {
  const allQuotes: VendorQuoteLS[] = JSON.parse(
    localStorage.getItem(this.QUOTE_KEY) || '[]'
  );

  const allPrs = JSON.parse(
    localStorage.getItem('erp.purchaseRequisitions') || '[]'
  );

  const currentVendor = this.getCurrentVendor();

  if (!currentVendor) {
    this.quoteList = [];
    this.messageService.add({
      severity: 'warn',
      summary: 'Vendor Not Found',
      detail: 'Vendor record could not be found.',
      life: 3000,
    });
    return;
  }

  if (currentVendor.status !== 'Approved') {
    this.quoteList = [];
    this.messageService.add({
      severity: 'warn',
      summary: 'Access Restricted',
      detail: 'Only approved vendors can view quotes.',
      life: 3000,
    });
    return;
  }

  const relatedQuotes = allQuotes.filter((quote: VendorQuoteLS) => {
    if (String(quote.vendorId) !== String(this.vendorId)) {
      return false;
    }

    const relatedPr = allPrs.find(
      (pr: any) => String(pr.id) === String(quote.prId)
    );

    if (!relatedPr) {
      return false;
    }

    return this.isPrRelatedToVendor(relatedPr, currentVendor);
  });

  this.quoteList = relatedQuotes
    .map((quote: VendorQuoteLS) => {
      const relatedPr = allPrs.find(
        (pr: any) => String(pr.id) === String(quote.prId)
      );

      return {
        ...quote,
        department: relatedPr
          ? this.getDepartmentName(relatedPr.department)
          : '---',
        prmNo: relatedPr?.prmNo || '---',
        prTitle: relatedPr?.title || '---',
      };
    })
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
