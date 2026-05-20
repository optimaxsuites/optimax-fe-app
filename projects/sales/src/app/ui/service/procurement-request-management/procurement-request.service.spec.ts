import { TestBed } from '@angular/core/testing';

import { ProcurementRequestService } from './procurement-request.service';

describe('ProcurementRequestService', () => {
  let service: ProcurementRequestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProcurementRequestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
