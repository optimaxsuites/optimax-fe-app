import { TestBed } from '@angular/core/testing';

import { AdvancePaymentRecordService } from './loan-payment-record.service';

describe('AdvancePaymentRecordService', () => {
  let service: AdvancePaymentRecordService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvancePaymentRecordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
