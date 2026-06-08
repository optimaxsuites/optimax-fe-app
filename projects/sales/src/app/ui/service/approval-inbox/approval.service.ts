import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ApprovalRequest, ApprovalStatus, ApprovalFilters, ApprovalStats, ApprovalComment } from '../../domain/approval-inbox/approval-request.dto';

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {

  private mockApprovals: ApprovalRequest[] = [
    {
      id: 'APR-001',
      requestId: 'REQ-001',
      requestType: 'PROCUREMENT',
      requestTitle: 'Office Laptops - 15 units',
      requesterId: 'EMP-001',
      requesterName: 'Maryann Okonkwo',
      requesterDepartment: 'IT Department',
      createdAt: new Date('2026-06-05T09:00:00'),
      submittedAt: new Date('2026-06-05T09:30:00'),
      budget: 22500,
      currency: 'NGN',
      items: [
        { id: '1', productName: 'Dell XPS Laptop', quantity: 15, budget: 22500 }
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
          userName: 'Saidat Abdulaziz',
          userRole: 'Requester',
          comment: 'Need these for the new accounting team starting next month',
          createdAt: new Date('2026-06-05T09:30:00'),
          isInternal: false
        }
      ]
    },
    {
      id: 'APR-002',
      requestId: 'ORD-001',
      requestType: 'ORDER',
      requestTitle: 'Multi-Item Order: Office Supplies + Furniture',
      requesterId: 'EMP-002',
      requesterName: 'Samuel Babatunde',
      requesterDepartment: 'Operations',
      createdAt: new Date('2026-06-06T10:00:00'),
      submittedAt: new Date('2026-06-06T10:15:00'),
      budget: 12500,
      currency: 'NGN',
      items: [
        { id: '1', productName: 'Office Chairs', quantity: 20, budget: 5000 },
        { id: '2', productName: 'Standing Desks', quantity: 10, budget: 7500 }
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
      requestId: 'SRV-001',
      requestType: 'SERVICE',
      requestTitle: 'Website Development Service',
      requesterId: 'EMP-003',
      requesterName: 'Chukwudi Michael',
      requesterDepartment: 'Marketing',
      createdAt: new Date('2026-06-04T14:00:00'),
      submittedAt: new Date('2026-06-04T14:20:00'),
      budget: 50000,
      currency: 'NGN',
      items: [
        { id: '1', productName: 'E-commerce Website Development', quantity: 1, budget: 50000 }
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
          actionAt: new Date('2026-06-04T15:30:00'),
          comments: 'Approved - aligns with Q3 marketing goals',
          required: true
        }
      ]
    },
    {
      id: 'APR-004',
      requestId: 'REQ-004',
      requestType: 'PROCUREMENT',
      requestTitle: 'Network Equipment',
      requesterId: 'EMP-001',
      requesterName: 'John Ademola',
      requesterDepartment: 'IT Department',
      createdAt: new Date('2026-06-03T11:00:00'),
      submittedAt: new Date('2026-06-03T11:30:00'),
      budget: 8000,
      currency: 'NGN',
      items: [
        { id: '1', productName: 'Cisco Switches', quantity: 4, budget: 8000 }
      ],
      currentLevel: 1,
      status: 'REJECTED',
      urgency: 'LOW',
      approvals: [
        {
          level: 1,
          approverId: 'APP-001',
          approverName: 'Manager',
          approverRole: 'Manager',
          status: 'REJECTED',
          actionAt: new Date('2026-06-04T10:00:00'),
          comments: 'Budget not available for this quarter. Please resubmit in Q4.',
          required: true
        }
      ]
    }
  ];

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