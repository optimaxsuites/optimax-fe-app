// import { Component, OnInit } from '@angular/core';
// import { PrStorageService } from '../../service/pr-storage.service';
// import { PrApprovalWorkflowService } from '../../service/pr-approval-workflow.service';

// @Component({
//   selector: 'app-purchase-req-management',
//   templateUrl: './purchase-req-management.component.html',
//   styleUrl: './purchase-req-management.component.scss',
// })
// export class PurchaseReqManagementComponent implements OnInit {
//   private readonly STORAGE_KEY = 'erp.purchaseRequisitions';

//   purchaseReqList: any[] = [];
//   selectedPurchaseReqList: any[] = [];

//   searchTerm: any;
//   activeItem: any = {};
//   isEdit!: boolean;
//   isCreate!: boolean;
//   purchaseReqTable: boolean = true;
//   purchaseReqForm: boolean = false;
//   isView: boolean = false;
//   filters: any = {};

//   departments = [
//     { id: 'd1', name: 'Operations' },
//     { id: 'd2', name: 'Finance' },
//     { id: 'd3', name: 'IT' },
//   ];

//   columns = [
//     { header: 'Title', field: 'title', sortable: true },
//     { header: 'PRM No', field: 'prmNo', sortable: true },
//     { header: 'Department', field: 'department', sortable: true },
//     { header: 'Budget Cap Amount', field: 'budgetCapAmount', sortable: true },
//     {
//       header: 'Required By',
//       field: 'requiredByDate',
//       sortable: true,
//       formatter: (row: any) =>
//         new Date(row.requiredByDate).toLocaleDateString('en-US', {
//           year: 'numeric',
//           month: 'short',
//           day: 'numeric',
//         }),
//     },
//     {
//       header: 'Status',
//       field: 'status',
//       sortable: true,
//       formatter: (row: any) => row.status ?? '__',
//       badgeClass: (row: any) =>
//         'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
//         this.statusBadgeClass(row.status),
//     },
//   ];

//   actions = [
//     { id: 'edit', label: 'Edit' },
//     { id: 'delete', label: 'Delete', className: 'danger' },
//   ];

//   constructor(
//     private store: PrStorageService,
//     private workflow: PrApprovalWorkflowService,
//   ) {}

//   ngOnInit(): void {
//     this.loadPurchaseReqs();

//     this.workflow.checkEscalations();
//     setInterval(() => {
//       this.workflow.checkEscalations();
//       this.loadPurchaseReqs();
//     }, 60_000);
//   }

//   openForm() {
//     this.purchaseReqTable = false;
//     this.purchaseReqForm = true;
//     this.isCreate = true;
//     this.isEdit = false;
//     this.isView = false;
//   }

//   openVendor($event: any) {
//     throw new Error('Method not implemented.');
//   }
//   onAction($event: { actionId: string; row: any }) {
//     throw new Error('Method not implemented.');
//   }

//   loadPurchaseReqs(): void {
//     const list = this.store.getAll();

//     // map departmentId to display name
//     this.purchaseReqList = list.map((pr) => ({
//       ...pr,
//       department: this.getDepartmentName(pr.department),
//     }));
//   }

//   onPrSaved(_: any) {
//     // refresh without closing form
//     this.loadPurchaseReqs();
//   }

//   private getDepartmentName(departmentId: string): string {
//     const dep = this.departments.find((d) => d.id === departmentId);
//     return dep ? dep.name : departmentId || '';
//   }

//   close() {
//     this.purchaseReqTable = true;
//     this.purchaseReqForm = false;
//     this.activeItem = {};

//     // ✅ Refresh table after closing create form
//     this.loadPurchaseReqs();
//   }

//   clearFilters() {
//     this.filters = {};
//   }

//   private readonly statusClasses: Record<string, string> = {
//     Draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
//     Inactive: 'bg-gray-200 text-gray-700 ring-1 ring-gray-300',
//     Cancelled: 'bg-gray-300 text-gray-900 ring-1 ring-gray-400',

//     Submitted: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
//     Converted: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',

//     Pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
//     PendingApproval: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
//     PendingRegistration: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
//     UnderReview: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',

//     Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
//     AiApproved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',

//     Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
//     AiRejected: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
//     AiFlagged: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',

//     AiPending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
//   };

//   statusBadgeClass(status: string): string {
//     return (
//       this.statusClasses[status] ??
//       'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
//     );
//   }
// }

import { Component, OnInit } from '@angular/core';
import { PrStorageService } from '../../service/pr-storage.service';
import { PrApprovalWorkflowService } from '../../service/pr-approval-workflow.service';
import { MessageService, ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-purchase-req-management',
  templateUrl: './purchase-req-management.component.html',
  styleUrl: './purchase-req-management.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class PurchaseReqManagementComponent implements OnInit {
  private readonly STORAGE_KEY = 'erp.purchaseRequisitions';

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
  selectedPr: any = null;

  departments = [
    { id: 'd1', name: 'Operations' },
    { id: 'd2', name: 'Finance' },
    { id: 'd3', name: 'IT' },
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
    { id: 'edit', label: 'Edit', hidden: (row: any) => row.status === 'UnderReview' },
    { id: 'delete', label: 'Delete', className: 'danger', hidden: (row: any) => row.status === 'UnderReview' },
  ];

  constructor(
    private store: PrStorageService,
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit(): void {
    this.loadPurchaseReqs();

    this.workflow.checkEscalations();
    setInterval(() => {
      this.workflow.checkEscalations();
      this.loadPurchaseReqs();
    }, 60_000);
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
    this.selectedPr = null;
  }

  onAction(event: { actionId: string; row: any }): void {
    const { actionId, row } = event;

    if (actionId === 'view') {
      this.viewPr(row);
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
      life: 3000
    });
    return;
  }

  this.activeItem = {
    ...row,
    items: [...(row.items || [])]
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
      life: 3000
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

  loadPurchaseReqs(): void {
    const list = this.store.getAll();

    this.purchaseReqList = list.map((pr) => ({
      ...pr,
      department: this.getDepartmentName(pr.department),
    }));
  }

  onPrSaved(_: any): void {
    this.loadPurchaseReqs();
    this.close();
  }

  private getDepartmentName(departmentId: string): string {
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
