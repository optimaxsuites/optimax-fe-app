import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ApprovalRequest, ApprovalStatus, ApprovalFilters, ApprovalStats, ApprovalComment } from '../../domain/approval-inbox/approval-request.dto';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {

  private readonly STORAGE_KEY = 'approval_requests';
  private mockApprovals: ApprovalRequest[] = [];

  constructor() {
    this.initData();
  }

  private initData(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.mockApprovals = parsed.map((a: any) => ({
            ...a,
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
            submittedAt: a.submittedAt ? new Date(a.submittedAt) : new Date(),
            comments: (a.comments || []).map((c: any) => ({ ...c, createdAt: c.createdAt ? new Date(c.createdAt) : new Date() })),
            approvals: (a.approvals || []).map((app: any) => ({
              ...app,
              actionAt: app.actionAt ? new Date(app.actionAt) : undefined
            }))
          }));
          return;
        }
      } catch (e) {
        console.error('Error parsing stored approvals:', e);
      }
    }
    this.loadDefaultApprovals();
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.mockApprovals));
  }

  private loadDefaultApprovals(): void {
    this.mockApprovals = [
      {
        id: 'APR-001',
        requestId: 'PR-001',
        requestType: 'PROCUREMENT',
        requestTitle: 'High-End Developer Laptops (M3 Max)',
        requesterId: 'CUST-101',
        requesterName: 'Maryann Okonkwo',
        requesterDepartment: 'IT Department',
        createdAt: new Date('2026-06-25T09:00:00'),
        submittedAt: new Date('2026-06-25T09:30:00'),
        budget: 15000000,
        currency: 'NGN',
        items: [
          { id: 'item-1', productName: 'MacBook Pro 16"', quantity: 10, budget: 15000000 }
        ],
        currentLevel: 1,
        status: 'IN_APPROVAL',
        urgency: 'HIGH',
        approvals: [
          {
            level: 1,
            approverId: 'APP-001',
            approverName: 'Manager',
            approverRole: 'Manager',
            status: 'PENDING',
            required: true
          }
        ],
        comments: [
          {
            id: 'C1',
            userId: 'EMP-001',
            userName: 'Maryann Okonkwo',
            userRole: 'Requester',
            comment: 'Need these for the new engineering team starting next month',
            createdAt: new Date('2026-06-25T09:30:00'),
            isInternal: false
          }
        ]
      },
      {
        id: 'APR-002',
        requestId: 'MO-001',
        requestType: 'ORDER',
        requestTitle: 'Q3 Corporate Facility Upgrades',
        requesterId: 'CUST-101',
        requesterName: 'Samuel Babatunde',
        requesterDepartment: 'Operations',
        createdAt: new Date('2026-06-15T10:00:00'),
        submittedAt: new Date('2026-06-15T10:15:00'),
        budget: 18500000,
        currency: 'NGN',
        items: [
          { id: 'oi-1', productName: 'Premium Ergonomic Chairs', quantity: 50, budget: 10000000 },
          { id: 'oi-2', productName: 'Modular Conference Tables', quantity: 5, budget: 8500000 }
        ],
        currentLevel: 1,
        status: 'IN_APPROVAL',
        urgency: 'MEDIUM',
        approvals: [
          {
            level: 1,
            approverId: 'APP-001',
            approverName: 'Manager',
            approverRole: 'Manager',
            status: 'PENDING',
            required: true
          }
        ]
      },
      {
        id: 'APR-003',
        requestId: 'PR-002',
        requestType: 'SERVICE',
        requestTitle: 'Janitorial & Corporate Cleaning Services',
        requesterId: 'CUST-102',
        requesterName: 'Chukwudi Michael',
        requesterDepartment: 'Marketing',
        createdAt: new Date('2026-06-20T14:00:00'),
        submittedAt: new Date('2026-06-20T14:20:00'),
        budget: 2400000,
        currency: 'NGN',
        items: [
          { id: 'item-2', productName: 'Office Cleaning Services', quantity: 6, budget: 2400000 }
        ],
        currentLevel: 1,
        status: 'APPROVED',
        urgency: 'URGENT',
        approvals: [
          {
            level: 1,
            approverId: 'APP-001',
            approverName: 'Manager',
            approverRole: 'Manager',
            status: 'APPROVED',
            actionAt: new Date('2026-06-20T15:30:00'),
            comments: 'Approved - aligns with Q3 facility plans',
            required: true
          }
        ]
      }
    ];
    this.saveToStorage();
  }

  getApprovalRequests(filters: ApprovalFilters): Observable<{ data: ApprovalRequest[]; totalElements: number; totalPages: number }> {
    let filtered = [...this.mockApprovals];
    
    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(a => a.status === filters.status);
    }
    
    if (filters.urgency && filters.urgency !== 'ALL') {
      filtered = filtered.filter(a => a.urgency === filters.urgency);
    }
    
    if (filters.department) {
      filtered = filtered.filter(a => a.requesterDepartment === filters.department);
    }
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.requestTitle.toLowerCase().includes(search) ||
        a.id.toLowerCase().includes(search) ||
        a.requesterName.toLowerCase().includes(search)
      );
    }
    
    const start = filters.page * filters.size;
    const paginated = filtered.slice(start, start + filters.size);
    
    return of({
      data: paginated,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / filters.size)
    }).pipe(delay(500));
  }

  getApprovalById(id: string): Observable<ApprovalRequest | undefined> {
    return of(this.mockApprovals.find(a => a.id === id)).pipe(delay(300));
  }

  getApprovalStats(): Observable<ApprovalStats> {
    const pending = this.mockApprovals.filter(a => a.status === 'IN_APPROVAL');
    const approvedToday = this.mockApprovals.filter(a => 
      a.status === 'APPROVED' && 
      a.approvals[a.approvals.length - 1]?.actionAt?.toDateString() === new Date().toDateString()
    );
    const rejectedThisWeek = this.mockApprovals.filter(a => 
      a.status === 'REJECTED' && 
      a.approvals[0]?.actionAt && 
      (new Date().getTime() - new Date(a.approvals[0].actionAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    );
    
    return of({
      pendingCount: pending.length,
      approvedToday: approvedToday.length,
      rejectedThisWeek: rejectedThisWeek.length,
      averageApprovalTime: '2.5 days',
      urgentPending: pending.filter(a => a.urgency === 'URGENT').length
    }).pipe(delay(300));
  }

  approveRequest(id: string, level: number, comments: string): Observable<ApprovalRequest> {
    const request = this.mockApprovals.find(a => a.id === id);
    if (request) {
      const currentApproval = request.approvals.find(a => a.level === level);
      if (currentApproval) {
        currentApproval.status = 'APPROVED';
        currentApproval.actionAt = new Date();
        currentApproval.comments = comments;
      }
      
      const nextLevel = request.approvals.find(a => a.level === level + 1);
      if (nextLevel) {
        request.currentLevel = level + 1;
        request.status = 'IN_APPROVAL';
      } else {
        request.status = 'APPROVED';
      }
      this.saveToStorage();
    }
    return of(request!).pipe(delay(500));
  }

  rejectRequest(id: string, level: number, comments: string): Observable<ApprovalRequest> {
    const request = this.mockApprovals.find(a => a.id === id);
    if (request) {
      const currentApproval = request.approvals.find(a => a.level === level);
      if (currentApproval) {
        currentApproval.status = 'REJECTED';
        currentApproval.actionAt = new Date();
        currentApproval.comments = comments;
      }
      request.status = 'REJECTED';
      this.saveToStorage();
    }
    return of(request!).pipe(delay(500));
  }

  addComment(id: string, comment: string, isInternal: boolean): Observable<ApprovalRequest> {
    const request = this.mockApprovals.find(a => a.id === id);
    if (request) {
      const newComment: ApprovalComment = {
        id: Math.random().toString(36).substr(2, 6),
        userId: 'APP-001',
        userName: 'Current User',
        userRole: 'Approver',
        comment: comment,
        createdAt: new Date(),
        isInternal: isInternal
      };
      request.comments = request.comments || [];
      request.comments.push(newComment);
      this.saveToStorage();
    }
    return of(request!).pipe(delay(300));
  }

  getDepartments(): Observable<string[]> {
    return of(['IT Department', 'Operations', 'Marketing', 'Finance', 'HR', 'Sales']).pipe(delay(100));
  }

  // In approval.service.ts

createApprovalRequest(data: any): Observable<ApprovalRequest> {
  const newApproval: ApprovalRequest = {
    id: 'APR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    requestId: data.requestId,
    requestType: data.requestType,
    requestTitle: data.requestTitle,
    requesterId: data.requesterId,
    requesterName: data.requesterName,
    requesterDepartment: data.requesterDepartment,
    createdAt: new Date(),
    submittedAt: new Date(),
    budget: data.budget,
    currency: data.currency,
    items: data.items,
    currentLevel: 1,
    status: 'IN_APPROVAL',
    urgency: data.urgency,
    approvals: data.approvals.map((a: any, index: number) => ({
      level: a.level,
      approverId: '', // Will be populated based on role
      approverName: this.getApproverNameByRole(a.approverRole),
      approverRole: a.approverRole,
      status: 'PENDING',
      required: a.required
    }))
  };
  
  this.mockApprovals.unshift(newApproval);
  this.saveToStorage();
  
  // Send notification to first approver
  this.sendApprovalNotification(newApproval);
  
  return of(newApproval).pipe(delay(500));
}

private getApproverNameByRole(role: string): string {
  return 'Manager';
}

private sendApprovalNotification(approval: ApprovalRequest): void {
  // Send email/in-app notification to approver
  console.log(`Approval notification sent to ${approval.approvals[0].approverName}`);
}
}