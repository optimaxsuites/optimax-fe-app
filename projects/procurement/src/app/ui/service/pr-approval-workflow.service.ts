import { Injectable } from '@angular/core';
import { PrStorageService } from './pr-storage.service';
import { PurchaseRequisitionLS, PRApproval, PRApprovalStep } from '../domain/procurement.dto';

@Injectable({
  providedIn: 'root'
})
export class PrApprovalWorkflowService {
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
  constructor(
    private store: PrStorageService
  ) { }

   private buildApproval(): PRApproval {
    const steps: PRApprovalStep[] = [
      { level: 1, role: 'DepartmentHead', approverUserId: 'u-dept-head-1', status: 'Pending', actedAt: null, comment: null },
      { level: 2, role: 'Finance',        approverUserId: 'u-finance-1',   status: 'NotStarted', actedAt: null, comment: null },
      { level: 3, role: 'Procurement',    approverUserId: 'u-proc-1',      status: 'NotStarted', actedAt: null, comment: null },
    ];

    return {
      currentLevel: 1,
      finalLevel: 3,
      state: 'Pending',
      steps,
      escalation: {
        enabled: true,
        dueHours: 24,
        escalateToUserId: 'u-admin-1',
        lastEscalatedAt: null,
      },
    };
  }

  submitForApproval(prId: number, requesterUserId: string): void {
    const pr = this.store.getById(prId);
    if (!pr) return;

    pr.status = 'UnderReview';
    pr.submittedAt = new Date().toISOString();
    pr.approval = this.buildApproval();

    // pr.auditTrail.push({ action: 'SUBMITTED', by: requesterUserId, at: new Date().toISOString() });

    this.store.update(pr);
  }

  approve(prId: number, approverUserId: string, comment?: string): void {
    const pr = this.store.getById(prId);
    if (!pr?.approval) return;

    const approval = pr.approval;
    const step = approval.steps.find(s => s.level === approval.currentLevel);
    if (!step || step.status !== 'Pending' || step.approverUserId !== approverUserId) return;

    step.status = 'Approved';
    step.actedAt = new Date().toISOString();
    step.comment = comment || null;

    // pr.auditTrail.push({
    //   action: `APPROVED_LEVEL_${approval.currentLevel}`,
    //   by: approverUserId,
    //   at: new Date().toISOString(),
    //   meta: { comment },
    // });

    if (approval.currentLevel < approval.finalLevel) {
      approval.currentLevel += 1;
      const next = approval.steps.find(s => s.level === approval.currentLevel);
      if (next) next.status = 'Pending';
      pr.status = 'UnderReview';
    } else {
      approval.state = 'Approved';
      pr.status = 'Approved';
      // pr.auditTrail.push({ action: 'FULLY_APPROVED', by: approverUserId, at: new Date().toISOString() });
    }

    this.store.update(pr);
  }

//   getPendingForApprover(userId: string) {
//   const prs = this.store.getAll();

//   return prs.filter(pr => {
//     if (pr.status !== 'UnderReview') return false;

//     const approval = pr.approval;
//     if (!approval) return false;

//     const currentStep = approval.steps.find(s => s.level === approval.currentLevel);
//     if (!currentStep) return false;

//     return currentStep.status === 'Pending' && currentStep.approverUserId === userId;
//   });
// }

getPendingForApprover(userId: string) {
  const prs = this.store.getAll();

  return prs
    .filter((pr) => {
      if (pr.status !== 'UnderReview') return false;

      const approval = pr.approval;
      if (!approval) return false;

      const currentStep = approval.steps.find(
        (s) => s.level === approval.currentLevel
      );
      if (!currentStep) return false;

      return (
        currentStep.status === 'Pending' &&
        currentStep.approverUserId === userId
      );
    })
    .map((pr) => ({
      ...pr,
      department: this.getDepartmentName(pr.department),
    }));
}
  getDepartmentName(departmentId: any): any {
    const dep = this.departments.find((d) => d.id === departmentId);
    return dep ? dep.name : departmentId || '';
  }

  reject(prId: number, approverUserId: string, reason: string): void {
    const pr = this.store.getById(prId);
    if (!pr?.approval) return;

    const approval = pr.approval;
    const step = approval.steps.find(s => s.level === approval.currentLevel);
    if (!step || step.status !== 'Pending' || step.approverUserId !== approverUserId) return;

    step.status = 'Rejected';
    step.actedAt = new Date().toISOString();
    step.comment = reason;

    approval.state = 'Rejected';
    pr.status = 'Rejected';

    // pr.auditTrail.push({
    //   action: `REJECTED_LEVEL_${approval.currentLevel}`,
    //   by: approverUserId,
    //   at: new Date().toISOString(),
    //   meta: { reason },
    // });

    this.store.update(pr);
  }

  checkEscalations(): void {
    const list = this.store.getAll();
    const now = Date.now();
    let changed = false;

    for (const pr of list) {
      if (pr.status !== 'UnderReview') continue;
      if (!pr.approval?.escalation?.enabled) continue;

      const step = pr.approval.steps.find(s => s.level === pr.approval!.currentLevel);
      if (!step || step.status !== 'Pending') continue;

      const baseTime = new Date(pr.submittedAt || pr.createdAt).getTime();
      const dueMs = pr.approval.escalation.dueHours * 60 * 60 * 1000;

      if (!pr.approval.escalation.lastEscalatedAt && (now - baseTime > dueMs)) {
        pr.approval.escalation.lastEscalatedAt = new Date().toISOString();
        // pr.auditTrail.push({
        //   action: 'ESCALATED',
        //   by: 'SYSTEM',
        //   at: new Date().toISOString(),
        //   meta: { escalatedTo: pr.approval.escalation.escalateToUserId, level: pr.approval.currentLevel },
        // });
        changed = true;
      }
    }

    if (changed) this.store.saveAll(list);
  }
}
