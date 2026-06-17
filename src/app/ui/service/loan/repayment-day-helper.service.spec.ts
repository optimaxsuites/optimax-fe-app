import { TestBed } from '@angular/core/testing';

import { RepaymentDayHelperService } from './repayment-day-helper.service';

describe('RepaymentDayHelperService', () => {
  let service: RepaymentDayHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RepaymentDayHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
