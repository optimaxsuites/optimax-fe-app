import { TestBed } from '@angular/core/testing';

import { LoanDisbursementConfirmationService } from './loan-disbursement-confirmation.service';

describe('LoanDisbursementConfirmationService', () => {
  let service: LoanDisbursementConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanDisbursementConfirmationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
