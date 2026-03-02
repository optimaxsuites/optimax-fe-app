import { TestBed } from '@angular/core/testing';

import { VendorComplianceService } from './vendor-compliance.service';

describe('VendorComplianceService', () => {
  let service: VendorComplianceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VendorComplianceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
