import { TestBed } from '@angular/core/testing';

import { VendorApprovalService } from './vendor-approval.service';

describe('VendorApprovalService', () => {
  let service: VendorApprovalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VendorApprovalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
