import { TestBed } from '@angular/core/testing';

import { BaseLoanService } from './base-loan.service';

describe('BaseLoanService', () => {
  let service: BaseLoanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseLoanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
