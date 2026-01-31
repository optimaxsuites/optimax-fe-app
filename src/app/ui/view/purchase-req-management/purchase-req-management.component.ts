import { Component, OnInit } from '@angular/core';
import { PrStorageService } from '../../service/pr-storage.service';
import { PrApprovalWorkflowService } from '../../service/pr-approval-workflow.service';

@Component({
  selector: 'app-purchase-req-management',
  templateUrl: './purchase-req-management.component.html',
  styleUrl: './purchase-req-management.component.scss',
})
export class PurchaseReqManagementComponent implements OnInit {
  private readonly STORAGE_KEY = 'erp.purchaseRequisitions';

  purchaseReqList: any[] = [];
  searchTerm: any;
  activeItem: any = {};
  isEdit!: boolean;
  isCreate!: boolean;
  purchaseReqTable: boolean = true;
  purchaseReqForm: boolean = false;
  isView: boolean = false;
  filters: any = {};

  // ✅ Same data used in create page (replace with API later)
  departments = [
    { id: 'd1', name: 'Operations' },
    { id: 'd2', name: 'Finance' },
    { id: 'd3', name: 'IT' },
  ];

    constructor(
    private store: PrStorageService,
    private workflow: PrApprovalWorkflowService
  ) {}

  // ngOnInit(): void {
  //   this.loadPurchaseReqsFromStorage();
  // }


  // ✅ Fetch + map localStorage → table rows
  // loadPurchaseReqsFromStorage(): void {
  //   const raw = localStorage.getItem(this.STORAGE_KEY);

  //   if (!raw) {
  //     this.purchaseReqList = [];
  //     return;
  //   }

  //   try {
  //     const list = JSON.parse(raw);

  //     // Ensure it is always an array
  //     const prs = Array.isArray(list) ? list : [];

  //     // Map departmentId → department name for display
  //     this.purchaseReqList = prs.map((pr: any) => ({
  //       ...pr,
  //       department: this.getDepartmentName(pr.department), // in storage you saved departmentId
  //     }));

  //     // Optional: sort newest first
  //     this.purchaseReqList.sort(
  //       (a: any, b: any) =>
  //         new Date(b.createdAt || b.submittedAt || 0).getTime() -
  //         new Date(a.createdAt || a.submittedAt || 0).getTime(),
  //     );

  //     console.log('✅ Loaded PRs from localStorage:', this.purchaseReqList);
  //   } catch (e) {
  //     console.error('❌ Failed to parse PRs from localStorage', e);
  //     this.purchaseReqList = [];
  //   }
  // }

  // private getDepartmentName(departmentId: string): string {
  //   const dep = this.departments.find((d) => d.id === departmentId);
  //   return dep ? dep.name : departmentId || '';
  // }

  // --- Existing functions ---
  openForm() {
    this.purchaseReqTable = false;
    this.purchaseReqForm = true;
    this.isCreate = true;
    this.isEdit = false;
    this.isView = false;
  }





    ngOnInit(): void {
    this.loadPurchaseReqs();

    // escalation simulation
    this.workflow.checkEscalations();
    setInterval(() => {
      this.workflow.checkEscalations();
      this.loadPurchaseReqs();
    }, 60_000);
  }

  loadPurchaseReqs(): void {
    const list = this.store.getAll();

    // map departmentId to display name
    this.purchaseReqList = list.map(pr => ({
      ...pr,
      department: this.getDepartmentName(pr.department),
    }));
  }

  onPrSaved(_: any) {
    // refresh without closing form
    this.loadPurchaseReqs();
  }

  private getDepartmentName(departmentId: string): string {
    const dep = this.departments.find(d => d.id === departmentId);
    return dep ? dep.name : departmentId || '';
  }
























  close() {
    this.purchaseReqTable = true;
    this.purchaseReqForm = false;
    this.activeItem = {};

    // ✅ Refresh table after closing create form
    this.loadPurchaseReqs();
  }

  clearFilters() {
    this.filters = {};
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'Draft':
        return 'badge badge-lightgrey';
      case 'Submitted':
        return 'badge badge-blue';
      case 'UnderReview':
        return 'badge badge-warning';
      case 'Approved':
        return 'badge badge-success';
      case 'Rejected':
        return 'badge badge-danger';
      case 'Cancelled':
        return 'badge badge-dark';
      case 'Converted':
        return 'badge badge-lightblue';
      default:
        return '';
    }
  }

  // onPrSaved(pr: any) {
  //   // Reload everything from storage (source of truth)
  //   this.loadPurchaseReqsFromStorage();

  //   // optional: keep form open but show the newly created PR in activeItem
  //   // this.activeItem = pr;

  //   console.log('✅ PR saved, table refreshed:', pr);
  // }





}
