import { TestBed } from '@angular/core/testing';

import { AdvanceDisbursementConfirmationService } from './loan-disbursement-confirmation.service';

describe('AdvanceDisbursementConfirmationService', () => {
  let service: AdvanceDisbursementConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdvanceDisbursementConfirmationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
