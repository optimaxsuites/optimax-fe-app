import { TestBed } from '@angular/core/testing';

import { DeliveryTrackingService } from './delivery-tracking.service';

describe('DeliveryTrackingService', () => {
  let service: DeliveryTrackingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryTrackingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
