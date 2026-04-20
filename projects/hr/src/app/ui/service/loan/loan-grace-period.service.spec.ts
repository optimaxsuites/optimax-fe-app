import { TestBed } from '@angular/core/testing';

import { AdvanceGracePeriodService } from './loan-grace-period.service';

describe('AdvanceGracePeriodService', () => {
  let service: AdvanceGracePeriodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvanceGracePeriodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
