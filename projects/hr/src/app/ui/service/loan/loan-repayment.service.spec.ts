import { TestBed } from '@angular/core/testing';

import { LoanRepaymentService } from './loan-repayment.service';

describe('LoanRepaymentService', () => {
  let service: LoanRepaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanRepaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
