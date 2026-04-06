import { Component, Input, OnInit } from '@angular/core';
import { PrStorageService } from '../../../service/pr-storage.service';
import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pr-list',
  templateUrl: './pr-list.component.html',
  styleUrl: './pr-list.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class PrListComponent implements OnInit {
  private readonly STORAGE_KEY = 'erp.purchaseRequisitions';
  private readonly QUOTE_KEY = 'vendorQuotes';
  private escalationInterval: any;

  @Input() mode: 'procurement' | 'vendor' = 'procurement';
  @Input() vendorId: string = ''; 

  purchaseReqList: any[] = [];
  selectedPurchaseReqList: any[] = [];

  searchTerm: any;
  activeItem: any = {};
  isEdit!: boolean;
  isCreate!: boolean;
  purchaseReqTable: boolean = true;
  purchaseReqForm: boolean = false;
  isView: boolean = false;
  filters: any = {};

  displayPrView = false;
  selectedPr!: PurchaseRequisitionLS;

departments = [
  {
    id: 'd1',
    name: 'Administration & Office Services',
    categories: [
      'Office Supplies',
      'Printing & Branding',
    ],
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
    categories: [
      'Consulting Services',
      'Training & Capacity Building',
    ],
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
    categories: [
      'Facility Management',
      'Security Services',
    ],
  },
  {
    id: 'd6',
    name: 'Supply Chain & Logistics',
    categories: [
      'Logistics & Transportation',
    ],
  },
  {
    id: 'd7',
    name: 'Healthcare & Medical',
    categories: [
      'Medical Supplies',
    ],
  },
  {
    id: 'd8',
    name: 'Marketing & Communications',
    categories: [
      'Marketing & Advertising',
      'Printing & Branding',
    ],
  },
  {
    id: 'd9',
    name: 'Hospitality & Events',
    categories: [
      'Catering Services',
    ],
  },
];

  columns = [
    { header: 'Title', field: 'title', sortable: true },
    { header: 'PRM No', field: 'prmNo', sortable: true },
    { header: 'Department', field: 'department', sortable: true },
    {
      header: 'Required By',
      field: 'requiredByDate',
      sortable: true,
      formatter: (row: any) =>
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
      formatter: (row: any) => row.status ?? '__',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
  ];

  actions = [
    { id: 'view', label: 'View' },
    {
      id: 'edit',
      label: 'Edit',
      hidden: (row: any) => row.status === 'UnderReview',
    },
    {
      id: 'delete',
      label: 'Delete',
      className: 'danger',
      hidden: (row: any) => row.status === 'UnderReview',
    },
  ];

  constructor(
    private router: Router,
    private store: PrStorageService,
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    console.log('vid', this.vendorId)
    this.loadPurchaseReqs();

    // Only procurement needs this workflow check
    if (this.isProcurementMode) {
      this.workflow.checkEscalations();
      setInterval(() => {
        this.workflow.checkEscalations();
        this.loadPurchaseReqs();
      }, 60_000);
    }
  }

  ngOnDestroy(): void {
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
    }
  }

  createQuoteFromPr(pr: any) {
    this.router.navigate([
      '/admin/procurement/vendor-portal/quote-form',
      this.vendorId,
      'create',
      pr.id,
      ':uuid'
    ]);
  }

    hasVendorAlreadyQuoted(prId: number | string): boolean {
    const quotes = JSON.parse(localStorage.getItem(this.QUOTE_KEY) || '[]');

    return quotes.some(
      (quote: any) =>
        String(quote.prId) === String(prId) &&
        Number(quote.vendorId) === Number(this.vendorId)
    );
  }

  get isVendorMode(): boolean {
    return this.mode === 'vendor';
  }

  get isProcurementMode(): boolean {
    return this.mode === 'procurement';
  }

  get tableActions(): any[] {
    if (this.isVendorMode) {
      return this.actions.filter((action) => action.id === 'view');
    }

    return this.actions;
  }

  get tableColumns(): any[] {
    if (this.isVendorMode) {
      return this.columns.filter((col) => col.field !== 'status');
    }

    return this.columns;
  }

  openForm(): void {
    this.activeItem = {};
    this.purchaseReqTable = false;
    this.purchaseReqForm = true;
    this.isCreate = true;
    this.isEdit = false;
    this.isView = false;
  }

  openVendor(row: any): void {
    this.selectedPr = { ...row };
    this.displayPrView = true;
  }

  closePrView(): void {
    this.displayPrView = false;
    this.selectedPr;
  }

  onAction(event: { actionId: string; row: any }): void {
    const { actionId, row } = event;

    if (actionId === 'view') {
      this.viewPr(row);
      return;
    }

    if (this.isVendorMode) {
      return;
    }

    if (actionId === 'edit') {
      this.editPr(row);
      return;
    }

    if (actionId === 'delete') {
      this.deletePr(row);
      return;
    }
  }

  viewPr(row: any): void {
    console.log(row);
    this.selectedPr = { ...row };
    this.displayPrView = true;
  }

  // editPr(row: any): void {
  //   if (row.status && row.status !== 'Draft') {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Edit Restricted',
  //       detail: 'Only draft PRs can be edited.',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   this.closePrView();
  //   this.activeItem = { ...row };
  //   this.purchaseReqTable = false;
  //   this.purchaseReqForm = true;
  //   this.isCreate = false;
  //   this.isEdit = true;
  //   this.isView = false;
  // }

  editPr(row: any): void {
    if (row.status === 'UnderReview') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Editing Not Allowed',
        detail: 'Submitted purchase requisitions cannot be edited.',
        life: 3000,
      });
      return;
    }

    this.activeItem = {
      ...row,
      items: [...(row.items || [])],
    };

    this.purchaseReqTable = false;
    this.purchaseReqForm = true;
    this.isCreate = false;
    this.isEdit = true;
    this.isView = false;
  }

  deletePr(row: any): void {
    if (row.status === 'UnderReview') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Deleting Not Allowed',
        detail: 'Submitted purchase requisitions cannot be deleted.',
        life: 3000,
      });
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to delete PR ${row.prmNo || ''}?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const existing = JSON.parse(
          localStorage.getItem(this.STORAGE_KEY) || '[]',
        );

        const updated = existing.filter((pr: any) => pr.id !== row.id);

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

        this.loadPurchaseReqs();
        this.closePrView();

        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Purchase Requisition deleted successfully.',
          life: 3000,
        });
      },
    });
  }

  // loadPurchaseReqs(): void {
  //   const list = this.store.getAll();

  //   this.purchaseReqList = list.map((pr) => ({
  //     ...pr,
  //     department: this.getDepartmentName(pr.department),
  //   }));
  // }

  private getCurrentVendor(): any | null {
  const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

  return (
    vendors.find(
      (vendor: any) => String(vendor.id) === String(this.vendorId)
    ) || null
  );
}

private getDepartmentById(departmentId: any): any | null {
  return this.departments.find((d) => d.id === departmentId) || null;
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

  const allowedCategories = (department.categories || []).map((category: string) =>
    category.trim().toLowerCase()
  );

  return vendorCategoryNames.some((vendorCategory: string) =>
    allowedCategories.includes(vendorCategory)
  );
}

//   loadPurchaseReqs(): void {
//   const list = this.store.getAll();

//   if (this.isVendorMode) {
//     const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');

//     const currentVendor = vendors.find(
//       (vendor: any) => String(vendor.id) === String(this.vendorId)
//     );

//     if (!currentVendor) {
//       this.purchaseReqList = [];
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Vendor Not Found',
//         detail: 'Vendor record could not be found.',
//         life: 3000,
//       });
//       return;
//     }

//     if (currentVendor.status !== 'Approved') {
//       this.purchaseReqList = [];
//       this.messageService.add({
//         severity: 'warn',
//         summary: 'Access Restricted',
//         detail: 'Only approved vendors can view purchase requisitions.',
//         life: 3000,
//       });
//       return;
//     }
//   }

//   this.purchaseReqList = list.map((pr) => ({
//     ...pr,
//     department: this.getDepartmentName(pr.department),
//     hasCreatedQuote: this.isVendorMode
//       ? this.hasVendorAlreadyQuoted(pr.id)
//       : false,
//   }));
// }

loadPurchaseReqs(): void {
  const list = this.store.getAll();

  if (this.isVendorMode) {
    const currentVendor = this.getCurrentVendor();

    if (!currentVendor) {
      this.purchaseReqList = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Vendor Not Found',
        detail: 'Vendor record could not be found.',
        life: 3000,
      });
      return;
    }

    if (currentVendor.status !== 'Approved') {
      this.purchaseReqList = [];
      this.messageService.add({
        severity: 'warn',
        summary: 'Access Restricted',
        detail: 'Only approved vendors can view purchase requisitions.',
        life: 3000,
      });
      return;
    }

    const filteredList = list.filter((pr: any) =>
      this.isPrRelatedToVendor(pr, currentVendor)
    );

    this.purchaseReqList = filteredList.map((pr: any) => ({
      ...pr,
      department: this.getDepartmentName(pr.department),
      hasCreatedQuote: this.hasVendorAlreadyQuoted(pr.id),
    }));

    return;
  }

  this.purchaseReqList = list.map((pr: any) => ({
    ...pr,
    department: this.getDepartmentName(pr.department),
    hasCreatedQuote: false,
  }));
}

  onPrSaved(_: any): void {
    this.loadPurchaseReqs();
    this.close();
  }

  getDepartmentName(departmentId: any): any {
    const dep = this.departments.find((d) => d.id === departmentId);
    return dep ? dep.name : departmentId || '';
  }

  close(): void {
    this.purchaseReqTable = true;
    this.purchaseReqForm = false;
    this.activeItem = {};
    this.isCreate = false;
    this.isEdit = false;
    this.isView = false;
    this.loadPurchaseReqs();
  }

  clearFilters(): void {
    this.filters = {};
  }

  getTotalBudgetCap(items: any[] = []): number {
    return items.reduce((sum, item) => sum + Number(item?.budgetCap || 0), 0);
  }

  formatDate(value: string): string {
    if (!value) return '---';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private readonly statusClasses: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    Inactive: 'bg-gray-200 text-gray-700 ring-1 ring-gray-300',
    Cancelled: 'bg-gray-300 text-gray-900 ring-1 ring-gray-400',

    Submitted: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    Converted: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',

    Pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingApproval: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingRegistration: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    UnderReview: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',

    Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    AiApproved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',

    Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    AiRejected: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
    AiFlagged: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',

    AiPending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
  };

  statusBadgeClass(status: string): string {
    return (
      this.statusClasses[status] ??
      'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
    );
  }
}
