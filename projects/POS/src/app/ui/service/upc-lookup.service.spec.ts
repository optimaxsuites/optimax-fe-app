import { TestBed } from '@angular/core/testing';

import { UpcLookupService } from './upc-lookup.service';

describe('UpcLookupService', () => {
  let service: UpcLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpcLookupService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
