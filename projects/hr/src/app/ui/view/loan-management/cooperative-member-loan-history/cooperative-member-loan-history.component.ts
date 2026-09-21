import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import * as XLSX from 'xlsx';
import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { BackButtonModule } from '../../../shared-component/view/back-button/back-button.module';

@Component({
  selector: 'app-cooperative-member-loan-history',
  templateUrl: './cooperative-member-loan-history.component.html',
  styleUrls: ['./cooperative-member-loan-history.component.scss']
})
export class CooperativeMemberLoanHistoryComponent implements OnInit {
  tableColumns = [
    { header: 'Loan ID', field: 'loanCode', sortable: true },
    { header: 'Date', field: 'applicationDate', sortable: true },
    { header: 'Amount', field: 'amount', sortable: true },
    { header: 'Status', field: 'status', sortable: true },
    { header: 'Actions', field: 'actions', sortable: false }
  ];
  
  readonly pageSize = 20;
  currentPage = 1;
  memberId: string = '';
  memberName: string = '';
  memberLoans: CooperativeLoan[] = [];
  filteredLoans: CooperativeLoan[] = [];
  viewSource: 'admin' | 'member' = 'admin';
  currentUuid: string = uuidV4();
  isLoading = false;

  statusFilter: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  sortField: string = 'applicationDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  readonly statusOptions: Array<{ label: string; value: string }> = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Disbursable', value: 'READY_FOR_DISBURSEMENT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Skipped', value: 'SKIPPED' },
    { label: 'Defaulted', value: 'DEFAULTED' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Paused', value: 'PAUSED' }
  ];

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService,
    private cooperativeService: CooperativeService
  ) {}

  ngOnInit(): void {
    this.viewSource = window.history.state?.source === 'member' ? 'member' : 'admin';
    this.currentUuid = window.history.state?.uuid || this.currentUuid;
    this.memberId = this.route.snapshot.paramMap.get('memberId') || '';
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || this.currentUuid;
    this.resolveMemberInfo();
    this.loadMemberLoans();
  }

  resolveMemberInfo(): void {
    const memberIdNum = Number(this.memberId);
    if (!memberIdNum) {
      this.memberName = '';
      return;
    }
    const member = this.cooperativeService.getMemberById(memberIdNum);
    if (member) {
      this.memberName = member.fullName || '';
    } else {
      // If not in cache, try to load from API
      this.cooperativeService.loadMemberById(memberIdNum).subscribe((loaded) => {
        this.memberName = loaded?.fullName || '';
      });
    }
  }

  get formattedMemberId(): string {
    const id = Number(this.memberId);
    if (!id) return '';
    return `COP-${String(id).padStart(3, '0')}`;
  }

  loadMemberLoans(): void {
    this.isLoading = true;
    const memberIdNum = Number(this.memberId);
    
    this.cooperativeService.getLoans().subscribe({
      next: (allLoans) => {
        this.memberLoans = allLoans.filter(loan => 
          loan.cooperativeMemberId === memberIdNum || 
          loan.memberId === memberIdNum
        );
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading member loans:', error);
        this.memberLoans = [];
        this.isLoading = false;
      }
    });
  }

  get activeLoansCount(): number {
    return this.memberLoans.filter(loan => loan.status === 'ACTIVE').length;
  }

  get totalLoanAmount(): number {
    return this.memberLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  applyFilters(): void {
    let result = [...this.memberLoans];
    
    if (this.statusFilter) {
      result = result.filter(l => l.status === this.statusFilter);
    }
    
    if (this.dateFrom) {
      const from = new Date(this.dateFrom).getTime();
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() >= from);
    }
    
    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.applicationDate || l.requestDate || '').getTime() <= to.getTime());
    }
    
    this.filteredLoans = this.sortData(result);
    this.resetPagination();
  }

  sortData(data: CooperativeLoan[]): CooperativeLoan[] {
    return [...data].sort((a, b) => {
      let vA: string | number = '';
      let vB: string | number = '';
      const extractNum = (val: any) => {
        const str = String(val || '');
        const match = str.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      switch (this.sortField) {
        case 'loanCode':
        case 'loanId':
        case 'id':
          vA = extractNum(a.loanCode || a.loanId || a.id);
          vB = extractNum(b.loanCode || b.loanId || b.id);
          break;
        case 'applicationDate':
          vA = new Date(a.applicationDate || a.requestDate || '').getTime();
          vB = new Date(b.applicationDate || b.requestDate || '').getTime();
          break;
        case 'amount':
          vA = Number(a.amount || 0);
          vB = Number(b.amount || 0);
          break;
        default:
          vA = new Date(a.applicationDate || a.requestDate || '').getTime();
          vB = new Date(b.applicationDate || b.requestDate || '').getTime();
      }
      if (typeof vA === 'number' && typeof vB === 'number') {
        return this.sortDirection === 'asc' ? vA - vB : vB - vA;
      }
      const cmp = String(vA).localeCompare(String(vB));
      return this.sortDirection === 'asc' ? cmp : -cmp;
    });
  }

  onFiltersChanged(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.statusFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  get paginationStart(): number {
    return this.filteredLoans.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  
  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredLoans.length);
  }
  
  get paginatedLoans(): CooperativeLoan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoans.slice(start, start + this.pageSize);
  }
  
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLoans.length / this.pageSize));
  }
  
  goBack(): void {
    this.location.back();
  }
  
  formatDate(dateValue: string | undefined): string {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }
  
  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    const normalized = String(status).trim().toUpperCase().replace(/\s+/g, '_');
    const statusClassMap: Record<string, string> = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'READY_FOR_DISBURSEMENT': 'status-ready_for_disbursement',
      'ACTIVE': 'status-active',
      'COMPLETED': 'status-completed',
      'REJECTED': 'status-rejected',
      'OVERDUE': 'status-overdue',
      'DEFAULTED': 'status-defaulted',
      'PAUSED': 'status-paused',
      'SKIPPED': 'status-skipped'
    };
    return statusClassMap[normalized] || 'status-pending';
  }

  getStatusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'READY_FOR_DISBURSEMENT': 'Disbursable',
      'ACTIVE': 'Active',
      'COMPLETED': 'Completed',
      'REJECTED': 'Rejected',
      'OVERDUE': 'Overdue',
      'DEFAULTED': 'Defaulted',
      'PAUSED': 'Paused',
      'SKIPPED': 'Skipped'
    };
    const key = (status || '').toUpperCase();
    if (map[key]) return map[key];
    return String(status || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  
  // ==================== ADD THIS METHOD INSIDE THE CLASS ====================
  viewLoanDetails(loan: CooperativeLoan): void {
    const loanId = loan.id;
    this.router.navigate(['/admin/hr/cooperative/loans', loanId, this.currentUuid], {
      queryParams: { dashboard: 'cooperative', mode: 'view' }
    });
  }
  // ==========================================================================
  
  exportToExcel(): void {
    const exportData = this.filteredLoans.map(loan => ({
      'Loan ID': loan.loanCode || loan.loanId || loan.id,
      'Application Date': loan.applicationDate || loan.requestDate,
      'Approved Date': loan.approvedDate,
      'Amount': loan.amount,
      'Purpose': loan.purpose,
      'Duration (months)': loan.repaymentTime || loan.duration,
      'Interest Rate': loan.interestRate,
      'Total Repayable': loan.totalRepayable,
      'Status': loan.status,
      'Disbursement Date': loan.disbursedDate,
      'Completion Date': loan.completedDate
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Loan_History_${this.memberId}`);
    XLSX.writeFile(workbook, `Loan_History_${this.memberId}.xlsx`);
  }
  
  exportToCSV(): void {
    const exportData = this.filteredLoans.map(loan => ({
      'Loan ID': loan.loanCode || loan.loanId || loan.id,
      'Application Date': loan.applicationDate || loan.requestDate,
      'Approved Date': loan.approvedDate,
      'Amount': loan.amount,
      'Purpose': loan.purpose,
      'Duration (months)': loan.repaymentTime || loan.duration,
      'Interest Rate': loan.interestRate,
      'Total Repayable': loan.totalRepayable,
      'Status': loan.status,
      'Disbursement Date': loan.disbursedDate,
      'Completion Date': loan.completedDate
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Loan_History_${this.memberId}`);
    XLSX.writeFile(workbook, `Loan_History_${this.memberId}.csv`, { bookType: 'csv' });
  }
  
  printReport(): void {
    window.print();
  }
}