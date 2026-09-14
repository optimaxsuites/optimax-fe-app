import { TestBed } from '@angular/core/testing';

import { PaymentConfigService } from './loan-payment-config.service';

describe('PaymentConfigService', () => {
  let service: PaymentConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
