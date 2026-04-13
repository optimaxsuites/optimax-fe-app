import { TestBed } from '@angular/core/testing';

import { GuestOrderService } from './guest-order.service';

describe('GuestOrderService', () => {
  let service: GuestOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
