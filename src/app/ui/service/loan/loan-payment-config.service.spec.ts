import { TestBed } from '@angular/core/testing';

import { LoanPaymentConfigService } from './loan-payment-config.service';

describe('LoanPaymentConfigService', () => {
  let service: LoanPaymentConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanPaymentConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
