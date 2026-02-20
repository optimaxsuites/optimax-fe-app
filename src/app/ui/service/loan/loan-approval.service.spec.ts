import { TestBed } from '@angular/core/testing';

import { LoanApprovalService } from './loan-approval.service';

describe('LoanApprovalService', () => {
  let service: LoanApprovalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanApprovalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
