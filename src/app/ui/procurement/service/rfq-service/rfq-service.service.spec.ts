import { TestBed } from '@angular/core/testing';

import { RfqServiceService } from './rfq-service.service';

describe('RfqServiceService', () => {
  let service: RfqServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RfqServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
