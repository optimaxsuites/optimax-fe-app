import { TestBed } from '@angular/core/testing';

import { SourcingService } from './sourcing.service';

describe('SourcingService', () => {
  let service: SourcingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SourcingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
