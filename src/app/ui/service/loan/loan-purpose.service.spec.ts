import { TestBed } from '@angular/core/testing';

import { LoanPurposeService } from './loan-purpose.service';

describe('LoanPurposeService', () => {
  let service: LoanPurposeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanPurposeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
