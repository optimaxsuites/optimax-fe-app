import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { 
  CooperativeMember, 
  CooperativeLoan, 
  CooperativeLoanProduct,
  CooperativeRepayment,
  CooperativeStats,
  CooperativeNotification
} from './cooperative.types';

@Injectable({
  providedIn: 'root'
})
export class CooperativeService {
  private storageKey = 'cooperative_data';
  
  private members: CooperativeMember[] = [];
  private loans: CooperativeLoan[] = [];
  private products: CooperativeLoanProduct[] = [];
  private repayments: CooperativeRepayment[] = [];
  private notifications: CooperativeNotification[] = [];
  
  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);
  private notificationsSubject = new BehaviorSubject<CooperativeNotification[]>([]);

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // ==================== INITIALIZATION ====================

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.members = data.members || [];
        this.loans = data.loans || [];
        this.products = (data.products || this.getDefaultProducts()).map((product: any) => ({
          ...product,
          patronageEligible: product.patronageEligible ?? true,
          patronageRate: product.patronageRate ?? 0
        }));
        this.repayments = data.repayments || [];
        this.notifications = (data.notifications || []).map((notification: any) => ({
          ...notification,
          type: notification.type || 'LOAN_PENDING_APPROVAL',
          recipient: notification.recipient || 'ADMIN'
        }));
      } catch (e) {
        console.error('Failed to load data', e);
      }
    }
  }

  private saveToStorage(): void {
    const data = {
      members: this.members,
      loans: this.loans,
      products: this.products,
      repayments: this.repayments,
      notifications: this.notifications
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.membersSubject.next([...this.members]);
    this.loansSubject.next([...this.loans]);
    this.notificationsSubject.next([...this.notifications]);
  }

  private getDefaultProducts(): CooperativeLoanProduct[] {
    return [
      {
        id: '1',
        name: 'Share-Backed Loan',
        description: 'Borrow against your share capital',
        minAmount: 10000,
        maxAmount: 1000000,
        interestRate: 5,
        minDuration: 3,
        maxDuration: 24,
        requiresShares: true,
        patronageEligible: true,
        patronageRate: 20,
        status: 'ACTIVE'
      },
      {
        id: '2',
        name: 'Regular Member Loan',
        description: 'Standard loan for active members',
        minAmount: 5000,
        maxAmount: 500000,
        interestRate: 8,
        minDuration: 3,
        maxDuration: 18,
        requiresShares: false,
        patronageEligible: true,
        patronageRate: 15,
        status: 'ACTIVE'
      },
      {
        id: '3',
        name: 'Emergency Loan',
        description: 'Quick loans for emergencies',
        minAmount: 2000,
        maxAmount: 100000,
        interestRate: 6.5,
        minDuration: 1,
        maxDuration: 6,
        requiresShares: true,
        patronageEligible: false,
        patronageRate: 0,
        status: 'ACTIVE'
      }
    ];
  }

  private initializeSampleData(): void {
    if (this.members.length === 0) {
      this.createSampleMembers();
      this.createSampleLoans();
      if (this.products.length === 0) {
        this.products = this.getDefaultProducts();
      }
      this.saveToStorage();
    } else if (this.products.length === 0) {
      this.products = this.getDefaultProducts();
      this.saveToStorage();
    }
  }

  private createSampleMembers(): void {
    const now = new Date().toISOString();
    this.members = [
      {
        id: '1',
        memberId: 'COP-001',
        fullName: 'Eseose Odion',
        email: 'eseose.odion@example.com',
        phone: '+234 803 123 4567',
        joinDate: '2023-01-15T10:30:00Z',
        status: 'ACTIVE',
        shareCapital: 150000,
        address: '23 Bourdillon Road, Ikoyi, Lagos',
        emergencyContact: {
          name: 'Osaro Odion',
          phone: '+234 803 234 5678',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2',
        memberId: 'COP-002',
        fullName: 'Chidi Okonkwo',
        email: 'chidi.okonkwo@example.com',
        phone: '+234 803 234 5678',
        joinDate: '2023-02-20T09:15:00Z',
        status: 'ACTIVE',
        shareCapital: 200000,
        address: '15 Awolowo Road, Ikoyi, Lagos',
        emergencyContact: {
          name: 'Nkechi Okonkwo',
          phone: '+234 803 345 6789',
          relationship: 'Spouse'
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3',
        memberId: 'COP-003',
        fullName: 'Aisha Mohammed',
        email: 'aisha.mohammed@example.com',
        phone: '+234 803 345 6789',
        joinDate: '2023-03-10T14:30:00Z',
        status: 'ACTIVE',
        shareCapital: 100000,
        address: '7 Kano Street, Alimosho, Lagos',
        emergencyContact: {
          name: 'Ibrahim Mohammed',
          phone: '+234 803 456 7890',
          relationship: 'Brother'
        },
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  private createSampleLoans(): void {
    const now = new Date().toISOString();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    this.loans = [
      {
        id: '1',
        loanId: 'COPLO-001',
        memberId: '1',
        productId: '1',
        amount: 350000,
        purpose: 'Home renovation',
        duration: 12,
        interestRate: 5,
        monthlyRepayment: 30625,
        totalRepayment: 367500,
        status: 'ACTIVE',
        applicationDate: sixMonthsAgo.toISOString(),
        approvedDate: sixMonthsAgo.toISOString(),
        disbursementDate: sixMonthsAgo.toISOString(),
        createdAt: now,
        updatedAt: now
      },
      {
        id: '2',
        loanId: 'COPLO-002',
        memberId: '2',
        productId: '2',
        amount: 150000,
        purpose: 'Children\'s school fees',
        duration: 9,
        interestRate: 8,
        monthlyRepayment: 18000,
        totalRepayment: 162000,
        status: 'ACTIVE',
        applicationDate: sixMonthsAgo.toISOString(),
        approvedDate: sixMonthsAgo.toISOString(),
        disbursementDate: sixMonthsAgo.toISOString(),
        createdAt: now,
        updatedAt: now
      },
      {
        id: '3',
        loanId: 'COPLO-003',
        memberId: '3',
        productId: '3',
        amount: 50000,
        purpose: 'Medical emergency',
        duration: 3,
        interestRate: 6.5,
        monthlyRepayment: 17750,
        totalRepayment: 53250,
        status: 'COMPLETED',
        applicationDate: '2023-08-01T10:00:00Z',
        approvedDate: '2023-08-03T10:00:00Z',
        disbursementDate: '2023-08-05T10:00:00Z',
        completionDate: '2023-11-05T10:00:00Z',
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  // ==================== MEMBER METHODS ====================

  getMembers(): Observable<CooperativeMember[]> {
    return of([...this.members]);
  }

  getMembersObservable(): Observable<CooperativeMember[]> {
    return this.membersSubject.asObservable();
  }

  getMemberById(id: string): CooperativeMember | undefined {
    return this.members.find(m => m.id === id || m.memberId === id);
  }

  addMember(member: Omit<CooperativeMember, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): CooperativeMember {
    const newMember: CooperativeMember = {
      ...member,
      id: Date.now().toString(),
      memberId: `COP-${String(this.members.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.members.push(newMember);
    this.saveToStorage();
    return { ...newMember };
  }

  updateMember(member: CooperativeMember): CooperativeMember {
    const index = this.members.findIndex(m => m.id === member.id);
    if (index !== -1) {
      member.updatedAt = new Date().toISOString();
      this.members[index] = member;
      this.saveToStorage();
    }
    return { ...member };
  }

  deleteMember(id: string): boolean {
    const index = this.members.findIndex(m => m.id === id);
    if (index !== -1) {
      this.members.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // ==================== LOAN METHODS ====================

  getLoans(): Observable<CooperativeLoan[]> {
    return of([...this.loans]);
  }

  getLoansObservable(): Observable<CooperativeLoan[]> {
    return this.loansSubject.asObservable();
  }

  getLoanById(id: string): CooperativeLoan | undefined {
    return this.loans.find(l => l.id === id || l.loanId === id);
  }

  getLoansByMember(memberId: string): CooperativeLoan[] {
    return this.loans.filter(l => l.memberId === memberId);
  }

  addLoan(loan: Omit<CooperativeLoan, 'id' | 'loanId' | 'createdAt' | 'updatedAt'>): CooperativeLoan {
    const newLoan: CooperativeLoan = {
      ...loan,
      id: Date.now().toString(),
      loanId: `COPLO-${String(this.loans.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.loans.push(newLoan);

    if (newLoan.status === 'PENDING') {
      this.createPendingApprovalNotification(newLoan);
    }

    this.saveToStorage();
    return { ...newLoan };
  }

  updateLoan(loan: CooperativeLoan): CooperativeLoan {
    const index = this.loans.findIndex(l => l.id === loan.id);
    if (index !== -1) {
      loan.updatedAt = new Date().toISOString();
      this.loans[index] = loan;
      this.saveToStorage();
    }
    return { ...loan };
  }

  approveLoan(id: string): CooperativeLoan | undefined {
    const loan = this.loans.find(item => item.id === id);
    if (!loan || loan.status !== 'PENDING') {
      return undefined;
    }

    loan.status = 'APPROVED';
    loan.approvedDate = new Date().toISOString();
    loan.fundsReserved = true;
    loan.updatedAt = new Date().toISOString();

    this.createMemberStatusNotification(
      loan,
      'Loan Approved',
      `Your loan ${loan.loanId} has been approved and funds are marked for disbursement.`
    );

    this.saveToStorage();
    return { ...loan };
  }

  disburseLoan(id: string): CooperativeLoan | undefined {
    const loan = this.loans.find(item => item.id === id);
    if (!loan || loan.status !== 'APPROVED') {
      return undefined;
    }

    loan.status = 'ACTIVE';
    loan.disbursementDate = new Date().toISOString();
    loan.fundsReserved = false;
    loan.updatedAt = new Date().toISOString();

    this.generateRepaymentSchedule(loan);
    this.createMemberStatusNotification(
      loan,
      'Loan Disbursed',
      `Your loan ${loan.loanId} has been disbursed and is now active with repayment schedule generated.`
    );

    this.saveToStorage();
    return { ...loan };
  }

  rejectLoan(id: string, reason: string): CooperativeLoan | undefined {
    const loan = this.loans.find(item => item.id === id);
    if (!loan || !reason.trim()) {
      return undefined;
    }

    loan.status = 'REJECTED';
    loan.rejectionReason = reason.trim();
    loan.fundsReserved = false;
    loan.updatedAt = new Date().toISOString();

    this.createMemberStatusNotification(
      loan,
      'Loan Rejected',
      `Your loan ${loan.loanId} was rejected. Reason: ${loan.rejectionReason}`
    );

    this.saveToStorage();
    return { ...loan };
  }

  requestLoanChanges(id: string, note: string): CooperativeLoan | undefined {
    const loan = this.loans.find(item => item.id === id);
    if (!loan || !note.trim()) {
      return undefined;
    }

    loan.adminRequestNote = note.trim();
    loan.updatedAt = new Date().toISOString();

    this.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_CHANGE_REQUESTED',
      recipient: 'MEMBER',
      title: 'Changes Requested',
      message: `Admin requested updates on loan ${loan.loanId}: ${loan.adminRequestNote}`,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToStorage();
    return { ...loan };
  }

  getRepaymentsByLoanId(loanId: string): CooperativeRepayment[] {
    this.ensureRepaymentScheduleForLoan(loanId);
    this.refreshOverdueStatuses(loanId);

    return this.repayments
      .filter(item => item.loanId === loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map(item => ({ ...item }));
  }

  recordRepayment(
    loanId: string,
    payload: { amount: number; paymentMethod: CooperativeRepayment['paymentMethod']; paidDate?: string }
  ): CooperativeRepayment | undefined {
    const loan = this.loans.find(item => item.id === loanId);
    if (!loan || loan.status !== 'ACTIVE') {
      return undefined;
    }

    this.refreshOverdueStatuses(loanId);

    const nextDue = this.repayments
      .filter(item => item.loanId === loanId && item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (!nextDue) {
      return undefined;
    }

    const paidAmount = Number(payload.amount || 0);
    if (paidAmount <= 0) {
      return undefined;
    }

    nextDue.amount = paidAmount;
    nextDue.paidDate = payload.paidDate || new Date().toISOString();
    nextDue.paymentMethod = payload.paymentMethod || 'BANK_TRANSFER';
    nextDue.status = 'PAID';

    const remainingOpen = this.repayments.some(item => item.loanId === loanId && item.status !== 'PAID');
    if (!remainingOpen) {
      loan.status = 'COMPLETED';
      loan.completionDate = new Date().toISOString();
      loan.updatedAt = new Date().toISOString();

      this.createMemberStatusNotification(
        loan,
        'Loan Completed',
        `All repayments for loan ${loan.loanId} are received. Your loan is now completed.`
      );
    }

    this.saveToStorage();
    return { ...nextDue };
  }

  getOverdueRepaymentsByLoanId(loanId: string): CooperativeRepayment[] {
    this.refreshOverdueStatuses(loanId);
    return this.repayments
      .filter(item => item.loanId === loanId && item.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map(item => ({ ...item }));
  }

  sendRepaymentReminder(loanId: string): boolean {
    const loan = this.loans.find(item => item.id === loanId);
    if (!loan) {
      return false;
    }

    const overdueItems = this.getOverdueRepaymentsByLoanId(loanId);
    const totalOverdue = overdueItems.reduce((sum, item) => sum + item.amount, 0);
    const message = overdueItems.length > 0
      ? `Reminder: ${overdueItems.length} repayment(s) are overdue for loan ${loan.loanId} totaling ${this.formatCurrency(totalOverdue)}.`
      : `Reminder: Your next repayment for loan ${loan.loanId} is due soon.`;

    this.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_REPAYMENT_REMINDER',
      recipient: 'MEMBER',
      title: 'Loan Repayment Reminder',
      message,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToStorage();
    return true;
  }

  markLoanAsDefaulted(loanId: string): CooperativeLoan | undefined {
    const loan = this.loans.find(item => item.id === loanId);
    if (!loan || (loan.status !== 'ACTIVE' && loan.status !== 'APPROVED')) {
      return undefined;
    }

    this.refreshOverdueStatuses(loanId);

    loan.status = 'DEFAULTED';
    loan.defaultedDate = new Date().toISOString();
    loan.updatedAt = new Date().toISOString();

    this.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_DEFAULTED',
      recipient: 'MEMBER',
      title: 'Loan Marked as Defaulted',
      message: `Your loan ${loan.loanId} has been marked as defaulted. Please contact the cooperative admin immediately.`,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });

    this.saveToStorage();
    return { ...loan };
  }

  applyPatronageToMemberLoan(memberId: string, amount: number): { appliedAmount: number; loanId?: string } {
    const patronageAmount = Number(amount || 0);
    if (patronageAmount <= 0) {
      return { appliedAmount: 0 };
    }

    const activeLoan = this.loans
      .filter(item => item.memberId === memberId && item.status === 'ACTIVE')
      .sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime())[0];

    if (!activeLoan) {
      return { appliedAmount: 0 };
    }

    this.ensureRepaymentScheduleForLoan(activeLoan.id);
    this.refreshOverdueStatuses(activeLoan.id);

    const openRepayments = this.repayments
      .filter(item => item.loanId === activeLoan.id && item.status !== 'PAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (openRepayments.length === 0) {
      return { appliedAmount: 0, loanId: activeLoan.id };
    }

    let remainingCredit = patronageAmount;
    const now = new Date().toISOString();

    openRepayments.forEach(item => {
      if (remainingCredit <= 0) {
        return;
      }

      if (remainingCredit >= item.amount) {
        remainingCredit -= item.amount;
        item.paidDate = now;
        item.paymentMethod = 'OTHER';
        item.status = 'PAID';
        return;
      }

      item.amount = Number((item.amount - remainingCredit).toFixed(2));
      remainingCredit = 0;
    });

    const appliedAmount = Number((patronageAmount - remainingCredit).toFixed(2));
    const stillOpen = this.repayments.some(item => item.loanId === activeLoan.id && item.status !== 'PAID');

    if (!stillOpen) {
      activeLoan.status = 'COMPLETED';
      activeLoan.completionDate = now;
      activeLoan.updatedAt = now;
    } else {
      activeLoan.updatedAt = now;
    }

    this.saveToStorage();
    return { appliedAmount, loanId: activeLoan.id };
  }

  // ==================== PRODUCT METHODS ====================

  getProducts(): CooperativeLoanProduct[] {
    return [...this.products];
  }

  getProductById(id: string): CooperativeLoanProduct | undefined {
    return this.products.find(p => p.id === id);
  }

  addProduct(product: Omit<CooperativeLoanProduct, 'id'>): CooperativeLoanProduct {
    const newProduct: CooperativeLoanProduct = {
      ...product,
      id: Date.now().toString(),
      patronageRate: product.patronageEligible ? product.patronageRate : 0
    };

    this.products.push(newProduct);
    this.saveToStorage();
    return { ...newProduct };
  }

  updateProduct(product: CooperativeLoanProduct): CooperativeLoanProduct {
    const index = this.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      this.products[index] = {
        ...product,
        patronageRate: product.patronageEligible ? product.patronageRate : 0
      };
      this.saveToStorage();
    }
    return { ...product };
  }

  setProductStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): void {
    const product = this.products.find(p => p.id === id);
    if (!product) {
      return;
    }

    product.status = status;
    this.saveToStorage();
  }

  // ==================== NOTIFICATION METHODS ====================

  getNotifications(): Observable<CooperativeNotification[]> {
    return of([...this.notifications]);
  }

  getNotificationsObservable(): Observable<CooperativeNotification[]> {
    return this.notificationsSubject.asObservable();
  }

  markNotificationAsRead(id: string): void {
    const notification = this.notifications.find(item => item.id === id);
    if (!notification) {
      return;
    }

    notification.read = true;
    this.saveToStorage();
  }

  private createPendingApprovalNotification(loan: CooperativeLoan): void {
    const member = this.getMemberById(loan.memberId);
    const product = this.getProductById(loan.productId);

    const notification: CooperativeNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_PENDING_APPROVAL',
      recipient: 'ADMIN',
      title: 'Loan Pending Approval',
      message: `${member?.fullName || 'Member'} submitted ${this.formatCurrency(loan.amount)} for ${product?.name || 'loan product'} (${loan.loanId}).`,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(notification);
  }

  private createMemberStatusNotification(loan: CooperativeLoan, title: string, message: string): void {
    this.notifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'LOAN_STATUS_UPDATE',
      recipient: 'MEMBER',
      title,
      message,
      loanId: loan.id,
      memberId: loan.memberId,
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  private generateRepaymentSchedule(loan: CooperativeLoan): void {
    this.repayments = this.repayments.filter(item => item.loanId !== loan.id);

    const monthlyAmount = Number((loan.totalRepayment / loan.duration).toFixed(2));
    const disbursementDate = loan.disbursementDate ? new Date(loan.disbursementDate) : new Date();

    for (let installment = 1; installment <= loan.duration; installment++) {
      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(disbursementDate.getMonth() + installment);

      this.repayments.push({
        id: `${loan.id}-RP-${installment}`,
        loanId: loan.id,
        amount: monthlyAmount,
        dueDate: dueDate.toISOString(),
        status: 'PENDING'
      });
    }
  }

  private ensureRepaymentScheduleForLoan(loanId: string): void {
    const loan = this.loans.find(item => item.id === loanId);
    if (!loan || loan.status !== 'ACTIVE') {
      return;
    }

    const hasRepayment = this.repayments.some(item => item.loanId === loanId);
    if (hasRepayment) {
      return;
    }

    this.generateRepaymentSchedule(loan);
    this.saveToStorage();
  }

  private refreshOverdueStatuses(loanId?: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updated = false;

    this.repayments.forEach(item => {
      if (loanId && item.loanId !== loanId) {
        return;
      }

      if (item.status === 'PAID') {
        return;
      }

      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);

      const nextStatus: CooperativeRepayment['status'] = due < today ? 'OVERDUE' : 'PENDING';
      if (item.status !== nextStatus) {
        item.status = nextStatus;
        updated = true;
      }
    });

    if (updated) {
      this.saveToStorage();
    }
  }

  // ==================== STATS METHODS ====================

  getStats(): CooperativeStats {
    const activeMembers = this.members.filter(m => m.status === 'ACTIVE').length;
    const activeLoans = this.loans.filter(l => l.status === 'ACTIVE').length;
    const pendingLoans = this.loans.filter(l => l.status === 'PENDING').length;
    
    const totalFund = this.members.reduce((sum, m) => sum + m.shareCapital, 0);
    const loanPortfolio = this.loans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.amount, 0);

    return {
      totalMembers: this.members.length,
      activeMembers,
      totalLoans: this.loans.length,
      activeLoans,
      pendingLoans,
      totalFund,
      loanPortfolio
    };
  }

  // ==================== UTILITY ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  }
}