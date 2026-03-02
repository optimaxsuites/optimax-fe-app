import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { 
  CooperativeMember, 
  CooperativeLoan, 
  CooperativeLoanProduct,
  CooperativeRepayment,
  CooperativeStats 
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
  
  private membersSubject = new BehaviorSubject<CooperativeMember[]>([]);
  private loansSubject = new BehaviorSubject<CooperativeLoan[]>([]);

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
        this.products = data.products || this.getDefaultProducts();
        this.repayments = data.repayments || [];
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
      repayments: this.repayments
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.membersSubject.next([...this.members]);
    this.loansSubject.next([...this.loans]);
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
        status: 'ACTIVE'
      }
    ];
  }

  private initializeSampleData(): void {
    if (this.members.length === 0) {
      this.createSampleMembers();
      this.createSampleLoans();
      this.saveToStorage();
    } else {
      this.products = this.getDefaultProducts();
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

  // ==================== PRODUCT METHODS ====================

  getProducts(): CooperativeLoanProduct[] {
    return [...this.products];
  }

  getProductById(id: string): CooperativeLoanProduct | undefined {
    return this.products.find(p => p.id === id);
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