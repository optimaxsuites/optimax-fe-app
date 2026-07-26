import { TestBed } from '@angular/core/testing';

import { VendorManagementService } from './vendor-management.service';

describe('VendorManagementService', () => {
  let service: VendorManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VendorManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
