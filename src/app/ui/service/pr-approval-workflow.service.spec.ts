import { TestBed } from '@angular/core/testing';

import { PrApprovalWorkflowService } from './pr-approval-workflow.service';

describe('PrApprovalWorkflowService', () => {
  let service: PrApprovalWorkflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrApprovalWorkflowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
