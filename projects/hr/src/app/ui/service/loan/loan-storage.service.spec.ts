import { TestBed } from '@angular/core/testing';

import { LoanStorageService } from './ui/service/loan/loan-storage.service';

describe('LoanStorageService', () => {
  let service: LoanStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoanStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
