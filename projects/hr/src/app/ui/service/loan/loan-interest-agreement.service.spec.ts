import { TestBed } from '@angular/core/testing';

import { AdvanceInterestAgreementService } from './loan-interest-agreement.service';

describe('AdvanceInterestAgreementService', () => {
  let service: AdvanceInterestAgreementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvanceInterestAgreementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
