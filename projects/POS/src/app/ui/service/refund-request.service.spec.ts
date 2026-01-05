import { TestBed } from '@angular/core/testing';

import { RefundRequestService } from './refund-request.service';

describe('RefundRequestService', () => {
  let service: RefundRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RefundRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
