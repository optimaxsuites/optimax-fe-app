import { TestBed } from '@angular/core/testing';

import { EmployeeCorrectionService } from './employee-correction.service';

describe('CorrectionrequestService', () => {
  let service: EmployeeCorrectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmployeeCorrectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
