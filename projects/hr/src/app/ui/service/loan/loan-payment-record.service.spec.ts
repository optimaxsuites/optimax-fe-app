import { TestBed } from '@angular/core/testing';

import { LoanPaymentRecordService } from './loan-payment-record.service';

describe('LoanPaymentRecordService', () => {
  let service: LoanPaymentRecordService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanPaymentRecordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
