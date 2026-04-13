import { TestBed } from '@angular/core/testing';

import { ApprovalWorkflowService } from './approval-workflow.service';

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApprovalWorkflowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
