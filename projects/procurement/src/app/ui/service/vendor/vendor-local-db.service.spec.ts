import { TestBed } from '@angular/core/testing';

import { VendorLocalDbService } from './vendor-local-db.service';

describe('VendorLocalDbService', () => {
  let service: VendorLocalDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VendorLocalDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
