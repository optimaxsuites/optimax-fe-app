import { TestBed } from '@angular/core/testing';

import { TaxHelperService } from './tax-helper.service';

describe('TaxHelperService', () => {
  let service: TaxHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaxHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
