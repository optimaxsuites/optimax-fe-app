import { TestBed } from '@angular/core/testing';

import { PaystackService } from './paystack.service';

describe('PaystackService', () => {
  let service: PaystackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaystackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
