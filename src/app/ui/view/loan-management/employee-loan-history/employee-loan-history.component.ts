import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { LoanApplication } from '../../../service/loan/loan.types';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import { CooperativeMember, CooperativeRepayment } from '../../../service/loan/cooperative-loan/cooperative.types';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-loan-history.component.html',
  styleUrls: ['./employee-loan-history.component.scss']
})
export class EmployeeLoanHistoryComponent implements OnInit {
  employeeId: string = '';
  employeeName: string = '';
  employeeLoans: LoanApplication[] = [];
  filteredLoans: LoanApplication[] = [];
  isLoading: boolean = true;
  viewSource: 'admin' | 'employee' = 'admin';
  historyMode: 'advance' | 'cooperative' = 'advance';
  currentUuid: string = uuidV4();
  cooperativeMember: CooperativeMember | null = null;
  private cooperativeLoanByCode = new Map<string, CooperativeLoan>();
  selectedLoanForDetails: LoanApplication | null = null;
  showLoanDetailsModal: boolean = false;
  
  // Sorting properties
  sortField: string = 'requestDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService,
    private loanApplicationService: LoanApplicationService,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService
  ) {}
  
  ngOnInit(): void {
    this.viewSource = window.history.state?.source === 'employee' ? 'employee' : 'admin';
    this.historyMode = window.history.state?.cooperative ? 'cooperative' : 'advance';
    this.currentUuid = window.history.state?.uuid || this.currentUuid;
    this.employeeName = window.history.state?.employeeName || this.employeeName;

    this.route.params.subscribe(params => {
      this.employeeId = params['employeeId'];
      this.currentUuid = params['uuid'] || this.currentUuid;
      this.loadEmployeeHistory();
    });
  }
  
  loadEmployeeHistory(): void {
    if (this.historyMode === 'cooperative') {
      this.loadCooperativeHistory();
      return;
    }

    this.isLoading = true;
    this.loanApplicationService.getApplicationsByEmployeeId(this.employeeId, this.employeeName).subscribe({
      next: (applications) => {
        // Fetch employee details for this employeeId
        this.employeeService.getEmployeeById(Number(this.employeeId)).toPromise()
          .then(employee => {
            this.employeeLoans = applications.map(loan => ({
              ...loan,
              fullName: employee?.fullName || loan.fullName,
              department: employee?.department || loan.department
            }));
            this.filteredLoans = [...this.employeeLoans];
            this.employeeName = employee?.fullName || (this.employeeLoans[0]?.fullName ?? '');
            // Apply initial sorting
            this.applySort();
            this.isLoading = false;
          })
          .catch(() => {
            this.employeeLoans = applications;
            this.filteredLoans = [...applications];
            this.employeeName = this.employeeLoans[0]?.fullName ?? '';
            this.applySort();
            this.isLoading = false;
          });
      },
      error: (error) => {
        console.error('Error loading employee history:', error);
        this.isLoading = false;
      }
    });
  }

  private loadCooperativeHistory(): void {
    this.isLoading = true;
    const member = this.cooperativeService.getMemberById(this.employeeId);

    if (!member) {
      this.employeeLoans = [];
      this.filteredLoans = [];
      this.employeeName = 'Cooperative Member';
      this.isLoading = false;
      return;
    }

    this.cooperativeMember = member;
    this.employeeName = member.fullName;
    const cooperativeLoans = this.cooperativeService
      .getLoansByMember(member.id)
      .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

    this.cooperativeLoanByCode.clear();
    cooperativeLoans.forEach(loan => {
      this.cooperativeLoanByCode.set(loan.loanCode, loan);
    });

    this.employeeLoans = cooperativeLoans.map(loan => this.mapCooperativeLoanToLoanApplication(loan, member));
    this.filteredLoans = [...this.employeeLoans];
    this.applySort();
    this.isLoading = false;
  }

  private mapCooperativeLoanToLoanApplication(loan: CooperativeLoan, member: CooperativeMember): LoanApplication {
    const repayments = this.cooperativeService
      .getRepaymentsByLoanId(loan.id.toString())
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalPaid = repayments
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const currentBalance = repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    let remainingBalance = Number(loan.repaymentAmount || 0);
    const repaymentSchedule = repayments.map((item, index) => {
      const totalPayment = Number(item.amount || 0);
      const principal = Number(item.principalComponent || Math.max(totalPayment - Number(item.interestComponent || 0), 0));
      const interest = Number(item.interestComponent || 0);
      remainingBalance = Math.max(Number((remainingBalance - totalPayment).toFixed(2)), 0);

      return {
        installmentNo: index + 1,
        dueDate: item.dueDate,
        principalAmount: principal,
        interestAmount: interest,
        totalAmount: totalPayment,
        paidAmount: item.status === 'PAID' ? totalPayment : 0,
        remainingBalance,
        status: item.status,
        paymentMethod: item.modeofPayment || 'BANK_TRANSFER'
      };
    });

    // Only allow valid status values
    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED'];
    let mappedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' = 'PENDING';
    if (loan.status === 'DEFAULTED') {
      mappedStatus = 'ACTIVE';
    } else if (allowedStatuses.includes(loan.status)) {
      mappedStatus = loan.status as typeof mappedStatus;
    } else {
      mappedStatus = 'PENDING';
    }

    return {
      id: Number(loan.id || 0),
      loanCode: loan.loanCode,
      employeeId: Number(member.id || 0),
      fullName: member.fullName,
      department: member.address || 'Cooperative',
      amount: Number(loan.amount || 0),
      modeOfPayment: 'MONTHLY',
      status: mappedStatus,
      requestDate: loan.requestDate,
      purpose: loan.purpose,
      repaymentTime: Number(loan.repaymentTime || 0),
      repaymentAmount: Number(loan.repaymentAmount || 0),
      acknowledgment: true,
      interestRate: 0, // Not present in DTO, set as needed
      currentBalance,
      totalPaid,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      outstandingPrincipal: Number(loan.outstandingPrincipal || currentBalance || 0),
      adminComment: loan.adminComment || '',
      statusHistory: [],
      repaymentSchedule,
      paymentHistory: repayments
        .filter((item: CooperativeRepayment) => item.status === 'PAID' && !!item.paidDate)
        .map((item: CooperativeRepayment, index: number) => ({
          id: index + 1,
          loanId: Number(loan.id || 0),
          paidAt: item.paidDate as string,
          principalAmount: Number(item.principalComponent || 0),
          interestPaid: Number(item.interestComponent || 0),
          lateFeeAmount: Number(item.lateFeeAmount || 0),
          totalAmount: Number(item.amount || 0),
          remainingBalance: Number(loan.outstandingPrincipal || 0),
          paymentMethod: item.modeofPayment || 'BANK_TRANSFER',
          referenceNumber: item.receiptNumber || `CPAY-${loan.loanCode}-${index + 1}`,
          installmentNo: index + 1,
          receiptNumber: item.receiptNumber || `CPAY-${loan.loanCode}-${index + 1}`,
          notes: '',
          receivedBy: 'System'
        }))
    };
  }
  
  // Sorting method
  sortData(data: LoanApplication[]): LoanApplication[] {
    return [...data].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      // Get values based on sort field
      switch(this.sortField) {
        case 'requestDate':
          valueA = new Date(a.requestDate).getTime();
          valueB = new Date(b.requestDate).getTime();
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'interestRate':
          valueA = a.interestRate ?? 0;
          valueB = b.interestRate ?? 0;
          break;
        case 'loanId':
          valueA = String(a.loanCode || a.id).toLowerCase();
          valueB = String(b.loanCode || b.id).toLowerCase();
          break;
        case 'purpose':
          valueA = a.purpose.toLowerCase();
          valueB = b.purpose.toLowerCase();
          break;
        case 'status':
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        case 'totalPaid':
          valueA = a.totalPaid;
          valueB = b.totalPaid;
          break;
        case 'currentBalance':
          valueA = a.currentBalance;
          valueB = b.currentBalance;
          break;
        default:
          return 0;
      }

      // Compare values
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Apply sorting
  applySort(): void {
    this.filteredLoans = this.sortData(this.employeeLoans);
  }

  // Set sort field and direction
  setSort(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending for dates, ascending for others
      this.sortField = field;
      this.sortDirection = field === 'requestDate' ? 'desc' : 'asc';
    }
    this.applySort();
  }

  // Get sort icon class
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort'; // Default unsorted icon
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  goBack(): void {
    if (this.historyMode === 'cooperative' && this.viewSource === 'employee') {
      this.backNavigationService.goBack(['/member/cooperative/dashboard', this.currentUuid]);
      return;
    }

    if (this.historyMode === 'cooperative' && this.viewSource === 'admin') {
      this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
        queryParams: { dashboard: 'cooperative' }
      });
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
  
  viewLoanDetails(loan: LoanApplication): void {
    if (this.historyMode === 'cooperative' && this.viewSource === 'admin') {
      const cooperativeLoan = this.cooperativeLoanByCode.get(loan.loanCode);
      if (cooperativeLoan) {
        this.router.navigate(['/admin/hr/cooperative/loans', cooperativeLoan.id, this.currentUuid], {
          queryParams: { dashboard: 'cooperative' }
        });
        return;
      }
    }

    if (this.viewSource === 'employee') {
      this.selectedLoanForDetails = loan;
      this.showLoanDetailsModal = true;
      return;
    }

    this.router.navigate(['/admin/hr/loan-management/loan-details', String(loan.id), uuidV4()], {
      state: { source: 'admin-history' }
    });
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }
  
  getStatusClass(status: string): string {
    switch(status) {
      case 'APPROVED': return 'status-approved';
      case 'PENDING': return 'status-pending';
      case 'REJECTED': return 'status-rejected';
      case 'ACTIVE': return 'status-active';
      case 'COMPLETED': return 'status-completed';
      default: return 'status-default';
    }
  }
  
  getTotalBorrowed(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.amount, 0);
  }
  
  getTotalPaid(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.totalPaid, 0);
  }
  
  getTotalBalance(): number {
    return this.employeeLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  }
}