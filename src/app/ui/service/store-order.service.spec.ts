import { TestBed } from '@angular/core/testing';

import { StoreOrderService } from './store-order.service';

describe('StoreOrderService', () => {
  let service: StoreOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StoreOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
