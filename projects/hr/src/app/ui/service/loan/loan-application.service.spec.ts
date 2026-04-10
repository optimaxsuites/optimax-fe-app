import { TestBed } from '@angular/core/testing';

import { LoanApplicationService } from './loan-application.service';

describe('LoanApplicationService', () => {
  let service: LoanApplicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanApplicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
